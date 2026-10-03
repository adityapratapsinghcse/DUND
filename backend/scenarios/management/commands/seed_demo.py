from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from scenarios.models import Scenario, ScenarioEvent
from adminpanel.models import SystemSettings, AuditLog

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds database with demo users, Operation Dhundh scenario, and initial system settings."

    def handle(self, *args, **options):
        self.stdout.write("Seeding DEGRADE demo data...")

        # 1. System Settings
        settings_obj = SystemSettings.get_settings()
        settings_obj.max_delay_sec = 300
        settings_obj.default_intensity = 0.35
        settings_obj.allow_self_registration = True
        settings_obj.max_participants_per_exercise = 12
        settings_obj.save()
        self.stdout.write(self.style.SUCCESS("[OK] System settings configured."))

        # 2. Users
        users_to_create = [
            {'username': 'admin', 'password': 'admin12345', 'role': 'ADMIN', 'rank': 'Brigadier', 'unit': 'MoD Cyber Command', 'is_staff': True, 'is_superuser': True},
            {'username': 'instructor', 'password': 'instructor123', 'role': 'INSTRUCTOR', 'rank': 'Colonel', 'unit': 'DSSC Tactical Faculty', 'is_staff': True, 'is_superuser': False},
            {'username': 'land1', 'password': 'trainee123', 'role': 'TRAINEE', 'rank': 'Major', 'unit': '14 Strike Corps', 'is_staff': False, 'is_superuser': False},
            {'username': 'air1', 'password': 'trainee123', 'role': 'TRAINEE', 'rank': 'Squadron Leader', 'unit': '45 Sqn Flying Daggers', 'is_staff': False, 'is_superuser': False},
            {'username': 'cyber1', 'password': 'trainee123', 'role': 'TRAINEE', 'rank': 'Captain', 'unit': 'Defence Cyber Agency', 'is_staff': False, 'is_superuser': False},
        ]

        created_users = {}
        for udata in users_to_create:
            username = udata['username']
            user, created = User.objects.get_or_create(username=username)
            user.set_password(udata['password'])
            user.role = udata['role']
            user.rank = udata['rank']
            user.unit = udata['unit']
            user.is_staff = udata['is_staff']
            user.is_superuser = udata['is_superuser']
            user.is_active = True
            user.save()
            created_users[username] = user
            status_text = "created" if created else "updated"
            self.stdout.write(f"  - User {username} ({user.role}): {status_text}")

        instructor_user = created_users['instructor']

        # 3. Scenario 1: Operation Dhundh – Border Sector (Prayagraj Sector, >= 8 events)
        s1, created = Scenario.objects.get_or_create(
            title="Operation Dhundh – Border Sector",
            defaults={
                'description': "Multi-domain coordinated offensive in a heavy EW contestation zone near Prayagraj. Trainees experience severe HF packet drops, GPS drift, and conflicting radar reports.",
                'domains': ["LAND", "AIR", "CYBER", "EW"],
                'roles': ["LAND", "AIR", "CYBER"],
                'difficulty': "HARD",
                'center_lat': 25.4358,
                'center_lon': 81.8463,
                'default_intensity': 0.45,
                'created_by': instructor_user,
            }
        )
        s1.events.all().delete()

        s1_events = [
            {
                't_offset_sec': 5,
                'event_type': 'TRUTH',
                'kind': 'RADAR_CONTACT',
                'source_role': 'HQ',
                'payload': {
                    'title': 'Unidentified Aerial Track 404',
                    'detail': 'Air surveillance radar contacts fast-mover bearing 340 at 420 knots descending toward Sector Alpha.',
                    'lat': 25.4850,
                    'lon': 81.8120,
                    'visible_to': ['AIR'],
                    'expected_actions': ['REQUEST_ISR', 'VERIFY']
                }
            },
            {
                't_offset_sec': 15,
                'event_type': 'TRUTH',
                'kind': 'CONVOY_MOVEMENT',
                'source_role': 'HQ',
                'payload': {
                    'title': 'Hostile Mechanized Column in Sector Bravo',
                    'detail': 'Forward scouts report 6 BMP-3 IFVs crossing river bridge coordinate. Ground forces require interdiction.',
                    'lat': 25.4410,
                    'lon': 81.8650,
                    'visible_to': ['LAND', 'AIR'],
                    'expected_actions': ['FIRE_SUPPORT', 'HOLD']
                }
            },
            {
                't_offset_sec': 25,
                'event_type': 'LINK_DOWN',
                'kind': 'COMM_DISRUPTION',
                'source_role': 'HQ',
                'payload': {
                    'source_role': 'HQ',
                    'target_role': 'LAND',
                    'title': 'Tactical VHF Repeater 04 Offline'
                }
            },
            {
                't_offset_sec': 35,
                'event_type': 'JAM_ZONE',
                'kind': 'EW_BARRAGE',
                'source_role': 'HQ',
                'payload': {
                    'lat': 25.4400,
                    'lon': 81.8500,
                    'radius_m': 6500.0,
                    'intensity': 0.85,
                    'title': 'Airborne Jamming Pod Active'
                }
            },
            {
                't_offset_sec': 45,
                'event_type': 'TRUTH',
                'kind': 'CYBER_INTRUSION',
                'source_role': 'CYBER',
                'payload': {
                    'title': 'Tactical Router Route Injection Compromise',
                    'detail': 'Telemetry stream poisoned with false GPS ephemeris. Packet corruption observed on Tactical Data Link.',
                    'lat': 25.4358,
                    'lon': 81.8463,
                    'visible_to': ['CYBER'],
                    'expected_actions': ['FALLBACK_COMMS', 'VERIFY']
                }
            },
            {
                't_offset_sec': 60,
                'event_type': 'TRUTH',
                'kind': 'AIR_RECON',
                'source_role': 'AIR',
                'payload': {
                    'title': 'Forward Ammunition Dump Confirmed',
                    'detail': 'High-resolution electro-optical feed isolates camouflaged resupply node in forest sector.',
                    'lat': 25.4600,
                    'lon': 81.8300,
                    'visible_to': ['LAND', 'AIR'],
                    'expected_actions': ['FIRE_SUPPORT', 'MOVE']
                }
            },
            {
                't_offset_sec': 75,
                'event_type': 'LINK_UP',
                'kind': 'COMM_RESTORATION',
                'source_role': 'HQ',
                'payload': {
                    'source_role': 'HQ',
                    'target_role': 'LAND',
                    'title': 'Satellite High-Frequency Fallback Re-established'
                }
            },
            {
                't_offset_sec': 90,
                'event_type': 'TRUTH',
                'kind': 'SIGNALS_INTERCEPT',
                'source_role': 'CYBER',
                'payload': {
                    'title': 'Hostile Fire Direction Intercept',
                    'detail': 'Enemy 152mm artillery battery transmitting firing orders for grid square 25.420N 81.880E.',
                    'lat': 25.4200,
                    'lon': 81.8800,
                    'visible_to': ['ALL'],
                    'expected_actions': ['MOVE', 'FIRE_SUPPORT']
                }
            },
            {
                't_offset_sec': 110,
                'event_type': 'TRUTH',
                'kind': 'DRONE_SWARM',
                'source_role': 'AIR',
                'payload': {
                    'title': 'Micro-Loitering Munition Incursion',
                    'detail': 'Acoustic array detects 5 kamikaze drones descending on HQ relay station.',
                    'lat': 25.4720,
                    'lon': 81.8550,
                    'visible_to': ['AIR', 'LAND'],
                    'expected_actions': ['VERIFY', 'FIRE_SUPPORT']
                }
            }
        ]

        for ev in s1_events:
            ScenarioEvent.objects.create(scenario=s1, **ev)
        self.stdout.write(self.style.SUCCESS(f"[OK] Created scenario: {s1.title} with {len(s1_events)} events."))

        # 4. Scenario 2: UAV Feed Spoofing & GPS Denial
        s2, _ = Scenario.objects.get_or_create(
            title="UAV Feed Spoofing & GPS Denial",
            defaults={
                'description': "Hostile cyber actors spoof UAV telemetry feeds while active jammers deny GPS timing synchronisation.",
                'domains': ["AIR", "CYBER", "EW"],
                'roles': ["AIR", "CYBER"],
                'difficulty': "MEDIUM",
                'center_lat': 25.3176,
                'center_lon': 82.9739,
                'default_intensity': 0.35,
                'created_by': instructor_user,
            }
        )
        s2.events.all().delete()
        ScenarioEvent.objects.create(
            scenario=s2, t_offset_sec=10, event_type='TRUTH', kind='PATROL_ROUTE',
            source_role='HQ', payload={'title': 'Drone Patrol Echo-7 on Station', 'lat': 25.3200, 'lon': 82.9700, 'visible_to': ['AIR'], 'expected_actions': ['VERIFY']}
        )
        ScenarioEvent.objects.create(
            scenario=s2, t_offset_sec=25, event_type='JAM_ZONE', kind='GPS_JAMMING',
            source_role='HQ', payload={'lat': 25.3176, 'lon': 82.9739, 'radius_m': 5000.0, 'intensity': 0.8, 'title': 'GPS Spoofing Beacon Detected'}
        )
        ScenarioEvent.objects.create(
            scenario=s2, t_offset_sec=40, event_type='TRUTH', kind='JAMMER_LOCATED',
            source_role='CYBER', payload={'title': 'Direction Finder Fix on Jammer', 'lat': 25.3100, 'lon': 82.9800, 'visible_to': ['CYBER', 'AIR'], 'expected_actions': ['FIRE_SUPPORT']}
        )
        self.stdout.write(self.style.SUCCESS(f"[OK] Created scenario: {s2.title}."))

        # 5. Scenario 3: Cyber Relay Infiltration & Blackout
        s3, _ = Scenario.objects.get_or_create(
            title="Cyber Relay Attack & Blackout",
            defaults={
                'description': "Critical fiber optic backbone compromised; command post isolated and forced to use unverified visual reports.",
                'domains': ["CYBER", "LAND"],
                'roles': ["CYBER", "LAND"],
                'difficulty': "EASY",
                'center_lat': 26.8467,
                'center_lon': 80.9462,
                'default_intensity': 0.25,
                'created_by': instructor_user,
            }
        )
        s3.events.all().delete()
        ScenarioEvent.objects.create(
            scenario=s3, t_offset_sec=10, event_type='TRUTH', kind='GRID_STATUS',
            source_role='HQ', payload={'title': 'Central Substation Voltage Fluctuation', 'lat': 26.8450, 'lon': 80.9450, 'visible_to': ['CYBER'], 'expected_actions': ['VERIFY']}
        )
        ScenarioEvent.objects.create(
            scenario=s3, t_offset_sec=30, event_type='LINK_DOWN', kind='FIBER_CUT',
            source_role='HQ', payload={'source_role': 'HQ', 'target_role': 'LAND', 'title': 'Backbone Severed'}
        )
        ScenarioEvent.objects.create(
            scenario=s3, t_offset_sec=50, event_type='TRUTH', kind='GRID_RESTORED',
            source_role='CYBER', payload={'title': 'Backup Genset Engaged', 'lat': 26.8500, 'lon': 80.9500, 'visible_to': ['LAND'], 'expected_actions': ['HOLD']}
        )
        self.stdout.write(self.style.SUCCESS(f"[OK] Created scenario: {s3.title}."))

        AuditLog.objects.create(
            actor=created_users['admin'],
            action='SYSTEM_SEEDED',
            target_type='SYSTEM',
            target_id='1',
            meta={'scenarios': 3, 'users': 5}
        )
        self.stdout.write(self.style.SUCCESS("[OK] Seed complete!"))
