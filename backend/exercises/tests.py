from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from exercises.models import Exercise, Participant, CommLink, ExerciseStatus
from scenarios.models import Scenario
from comms.models import TruthEvent, Decision
from exercises.scorecard import calculate_participant_scorecard

User = get_user_model()

class ExerciseFlowAndRoleGuardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin_u', password='pw', role='ADMIN')
        self.instructor = User.objects.create_user(username='inst_u', password='pw', role='INSTRUCTOR')
        self.trainee = User.objects.create_user(username='train_u', password='pw', role='TRAINEE')

        self.scenario = Scenario.objects.create(
            title="S1",
            roles=["LAND", "AIR"],
            created_by=self.instructor
        )

    def test_role_guards_trainee_cannot_create_or_start_exercise(self):
        # Trainee tries to create exercise -> should be forbidden (403)
        self.client.force_authenticate(user=self.trainee)
        res = self.client.post('/api/exercises/', {'scenario': self.scenario.id})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Instructor creates exercise
        self.client.force_authenticate(user=self.instructor)
        res = self.client.post('/api/exercises/', {'scenario': self.scenario.id})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        ex_id = res.data['id']
        join_code = res.data['join_code']

        # Trainee cannot start exercise
        self.client.force_authenticate(user=self.trainee)
        res_start = self.client.post(f'/api/exercises/{ex_id}/start/')
        self.assertEqual(res_start.status_code, status.HTTP_403_FORBIDDEN)

        # Trainee CAN join exercise
        res_join = self.client.post('/api/exercises/join/', {'join_code': join_code, 'role': 'LAND'})
        self.assertEqual(res_join.status_code, status.HTTP_200_OK)

        # Instructor starts exercise
        self.client.force_authenticate(user=self.instructor)
        res_start_ok = self.client.post(f'/api/exercises/{ex_id}/start/')
        self.assertEqual(res_start_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_start_ok.data['status'], ExerciseStatus.RUNNING)

    def test_scorecard_and_brier_calibration(self):
        ex = Exercise.objects.create(
            scenario=self.scenario,
            instructor=self.instructor,
            join_code='CALIB1',
            status='RUNNING'
        )
        p = Participant.objects.create(exercise=ex, user=self.trainee, role='LAND')

        # Decision 1: High confidence (0.9), Correct -> Brier error (0.9 - 1.0)^2 = 0.01
        Decision.objects.create(
            exercise=ex,
            participant=p,
            action_type='MOVE',
            self_confidence=0.9,
            latency_sec=4.2,
            correct=True
        )

        # Decision 2: High confidence (0.8), Wrong -> Brier error (0.8 - 0.0)^2 = 0.64
        Decision.objects.create(
            exercise=ex,
            participant=p,
            action_type='HOLD',
            self_confidence=0.8,
            latency_sec=6.0,
            correct=False
        )

        # Decision 3: Fallback comms action
        Decision.objects.create(
            exercise=ex,
            participant=p,
            action_type='FALLBACK_COMMS',
            self_confidence=0.5,
            latency_sec=2.0,
            correct=True
        )

        card = calculate_participant_scorecard(p)
        self.assertEqual(card['decisions'], 3)
        self.assertEqual(card['used_fallback_comms'], 1)
        self.assertAlmostEqual(card['accuracy'], 66.7, places=1)
        self.assertGreater(card['calibration_error'], 0.0)
