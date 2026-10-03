import random
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from comms.degradation import plan_report, sanitize_trainee_payload
from comms.serializers import TraineeReportSerializer, InstructorReportSerializer
from comms.models import Report, TruthEvent
from exercises.models import Exercise, Participant
from scenarios.models import Scenario

User = get_user_model()

class DegradationPipelineTests(TestCase):
    def test_reproducible_degradation_with_same_seed(self):
        """Same seed and same quality must yield identical degradation decisions."""
        payload = {'title': 'Hostile Radar Contact', 'lat': 25.435, 'lon': 81.846, 'visible_to': ['AIR']}
        seed = 42891

        rng1 = random.Random(seed)
        reports_run1 = plan_report(q=0.5, rng=rng1, payload=payload, link_up=True)

        rng2 = random.Random(seed)
        reports_run2 = plan_report(q=0.5, rng=rng2, payload=payload, link_up=True)

        self.assertEqual(len(reports_run1), len(reports_run2))
        self.assertEqual(reports_run1[0]['status'], reports_run2[0]['status'])
        self.assertEqual(reports_run1[0]['confidence'], reports_run2[0]['confidence'])
        self.assertEqual(reports_run1[0]['delay_sec'], reports_run2[0]['delay_sec'])
        self.assertEqual(reports_run1[0]['is_corrupted'], reports_run2[0]['is_corrupted'])
        self.assertEqual(reports_run1[0]['payload'], reports_run2[0]['payload'])

    def test_sanitize_payload_strips_expected_actions_and_visible_to(self):
        raw_payload = {
            'title': 'Secret Target',
            'lat': 25.4,
            'lon': 81.8,
            'visible_to': ['LAND'],
            'expected_actions': ['FIRE_SUPPORT', 'HOLD']
        }
        clean = sanitize_trainee_payload(raw_payload)
        self.assertNotIn('expected_actions', clean)
        self.assertNotIn('visible_to', clean)
        self.assertEqual(clean['title'], 'Secret Target')

class SecurityConfidentialityTests(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(username='inst_test', password='password123', role='INSTRUCTOR')
        self.trainee = User.objects.create_user(username='trainee_test', password='password123', role='TRAINEE')
        self.scenario = Scenario.objects.create(title='Test Scenario', created_by=self.instructor)
        self.exercise = Exercise.objects.create(
            scenario=self.scenario,
            instructor=self.instructor,
            join_code='TEST01',
            status='RUNNING'
        )
        self.participant = Participant.objects.create(
            exercise=self.exercise,
            user=self.trainee,
            role='LAND'
        )
        from django.utils import timezone
        self.truth_event = TruthEvent.objects.create(
            exercise=self.exercise,
            kind='TARGET',
            payload={'title': 'Enemy HQ', 'expected_actions': ['FIRE_SUPPORT'], 'visible_to': ['LAND']}
        )
        self.report = Report.objects.create(
            truth_event=self.truth_event,
            exercise=self.exercise,
            participant=self.participant,
            status='DELIVERED',
            origin='CONFLICT',
            confidence='PROBABLE',
            payload={'title': 'Enemy HQ', 'lat': 25.4, 'lon': 81.8, 'expected_actions': ['FIRE_SUPPORT']},
            is_corrupted=True,
            delay_sec=14.5,
            deliver_at=timezone.now(),
            delivered_at=timezone.now()
        )

    def test_trainee_serializer_never_exposes_confidential_fields(self):
        """CRITICAL: Trainee network responses must never expose origin, is_corrupted, delay_sec, or expected_actions."""
        serializer = TraineeReportSerializer(self.report)
        data = serializer.data

        self.assertNotIn('origin', data, "Trainee serializer leaked 'origin'!")
        self.assertNotIn('is_corrupted', data, "Trainee serializer leaked 'is_corrupted'!")
        self.assertNotIn('delay_sec', data, "Trainee serializer leaked 'delay_sec'!")
        self.assertNotIn('expected_actions', data.get('payload', {}), "Trainee serializer leaked 'expected_actions' inside payload!")

    def test_trainee_feed_endpoint_security(self):
        self.client.force_authenticate(user=self.trainee)
        res = self.client.get(f'/api/exercises/{self.exercise.id}/feed/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reports = res.data.get('reports', [])
        self.assertGreaterEqual(len(reports), 1)
        r = reports[0]
        self.assertNotIn('origin', r)
        self.assertNotIn('is_corrupted', r)
        self.assertNotIn('delay_sec', r)
        self.assertNotIn('expected_actions', r.get('payload', {}))
