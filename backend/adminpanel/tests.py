from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from adminpanel.models import AuditLog, SystemSettings

User = get_user_model()

class AdminPanelTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin_boss', password='pw', role='ADMIN')
        self.instructor = User.objects.create_user(username='inst_user', password='pw', role='INSTRUCTOR')
        self.trainee = User.objects.create_user(username='train_user', password='pw', role='TRAINEE')

    def test_non_admin_cannot_access_admin_stats(self):
        self.client.force_authenticate(user=self.trainee)
        res = self.client.get('/api/admin/stats/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.instructor)
        res = self.client.get('/api/admin/stats/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_view_stats_and_update_settings(self):
        self.client.force_authenticate(user=self.admin)
        res_stats = self.client.get('/api/admin/stats/')
        self.assertEqual(res_stats.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', res_stats.data)
        self.assertIn('exercises_per_day_14d', res_stats.data)

        # Patch system settings
        res_patch = self.client.patch('/api/admin/settings/', {'max_delay_sec': 450})
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['max_delay_sec'], 450)

        # Verify audit log recorded
        audit = AuditLog.objects.filter(action='SETTINGS_UPDATE').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor, self.admin)
