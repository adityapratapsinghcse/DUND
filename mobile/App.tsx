import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, ActivityIndicator, Alert, StatusBar, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { tokens as themeTokens, TraineeReport, Scorecard, ActionType } from '@degrade/shared';

type Screen = 'LOGIN' | 'JOIN' | 'LOBBY' | 'TACTICAL' | 'RESULT' | 'SETTINGS';

export default function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');
  const palette = themeTokens[themeMode];

  const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');
  const [serverUrl, setServerUrl] = useState('http://10.0.2.2:8000'); // Standard Android emulator loopback or LAN IP
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Join & Exercise State
  const [joinCode, setJoinCode] = useState('');
  const [selectedRole, setSelectedRole] = useState('LAND');
  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [exerciseStatus, setExerciseStatus] = useState('LOBBY');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [signalBars, setSignalBars] = useState(4);
  const [linkQuality, setLinkQuality] = useState(1.0);
  const [reports, setReports] = useState<TraineeReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<TraineeReport | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting'>('connected');

  // Decision Input
  const [selectedAction, setSelectedAction] = useState<ActionType>('MOVE');
  const [confidence, setConfidence] = useState(80);

  // Load Settings & Persistence
  useEffect(() => {
    AsyncStorage.getItem('degrade_theme').then((t) => {
      if (t === 'light' || t === 'dark') setThemeMode(t);
    });
    AsyncStorage.getItem('degrade_server').then((s) => {
      if (s) setServerUrl(s);
    });
  }, []);

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    AsyncStorage.setItem('degrade_theme', next);
  };

  // GPS Location Streaming every ~5 seconds during RUNNING exercise
  useEffect(() => {
    let locSub: Location.LocationSubscription | null = null;
    let streamInterval: any = null;

    if (currentScreen === 'TACTICAL' && exerciseStatus === 'RUNNING' && exerciseId && token) {
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status === 'granted') {
          streamInterval = setInterval(async () => {
            try {
              const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              await fetch(`${serverUrl}/api/exercises/${exerciseId}/position/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                }),
              });
            } catch (_) {}
          }, 5000);
        }
      });
    }

    return () => {
      if (streamInterval) clearInterval(streamInterval);
      if (locSub) (locSub as any).remove();
    };
  }, [currentScreen, exerciseStatus, exerciseId, token, serverUrl]);

  // Periodic Telemetry Poll (every 3s)
  useEffect(() => {
    let pollInterval: any;
    if ((currentScreen === 'LOBBY' || currentScreen === 'TACTICAL') && exerciseId && token) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${serverUrl}/api/exercises/${exerciseId}/feed/`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setExerciseStatus(data.status);
            setElapsedSec(data.elapsed_sec);
            setSignalBars(data.bars);
            setLinkQuality(data.quality);
            setReports(data.reports);
            setConnectionState('connected');

            if (data.status === 'RUNNING' && currentScreen === 'LOBBY') {
              setCurrentScreen('TACTICAL');
            } else if (data.status === 'ENDED' && currentScreen === 'TACTICAL') {
              // Fetch scorecard
              const scRes = await fetch(`${serverUrl}/api/exercises/${exerciseId}/scorecard/`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (scRes.ok) {
                const sc = await scRes.json();
                setScorecard(sc);
                setCurrentScreen('RESULT');
              }
            }
          } else {
            setConnectionState('reconnecting');
          }
        } catch (_) {
          setConnectionState('reconnecting');
        }
      }, 3000);
    }
    return () => clearInterval(pollInterval);
  }, [currentScreen, exerciseId, token, serverUrl]);

  // Handle Login
  const handleLogin = async (u: string, p: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access);
        setUser(data.user);
        setCurrentScreen('JOIN');
      } else {
        Alert.alert('Authentication Failed', 'Invalid credentials or server unreachable.');
      }
    } catch (e: any) {
      Alert.alert('Connection Error', `Failed to connect to ${serverUrl}. Check IP and Wi-Fi connection.`);
    }
  };

  // Handle Join Exercise
  const handleJoin = async () => {
    if (!joinCode || !token) return;
    try {
      const res = await fetch(`${serverUrl}/api/exercises/join/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ join_code: joinCode.trim().toUpperCase(), role: selectedRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setExerciseId(data.exercise_id);
        setExerciseStatus(data.status);
        if (data.status === 'RUNNING') {
          setCurrentScreen('TACTICAL');
        } else {
          setCurrentScreen('LOBBY');
        }
      } else {
        Alert.alert('Join Failed', data.error || 'Could not join exercise room.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // Submit Tactical Order
  const handleSubmitDecision = async () => {
    if (!exerciseId || !token) return;
    try {
      const res = await fetch(`${serverUrl}/api/exercises/${exerciseId}/decisions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action_type: selectedAction,
          self_confidence: confidence / 100.0,
          truth_event: selectedReport?.id,
          details: { via: 'mobile_expo_station' },
        }),
      });
      if (res.ok) {
        Alert.alert('Command Transmitted', `Order [${selectedAction}] logged at ${confidence}% confidence.`);
        setSelectedReport(null);
      }
    } catch (_) {
      Alert.alert('Transmission Failed', 'Check signal bars before retrying.');
    }
  };

  const dynamicStyles = {
    container: { backgroundColor: palette.bg },
    surface: { backgroundColor: palette.surface, borderColor: palette.border },
    surface2: { backgroundColor: palette.surface2, borderColor: palette.border },
    text: { color: palette.fg },
    mutedText: { color: palette.muted },
    primaryBtn: { backgroundColor: palette.primary },
    accentText: { color: palette.accent },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.container]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={[styles.header, dynamicStyles.surface]}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandText, dynamicStyles.text]}>DEGRADE</Text>
          <Text style={[styles.roleBadge, { backgroundColor: palette.primary + '20', color: palette.primary }]}>
            TRAINEE APP
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
            <Text style={{ fontSize: 16 }}>{themeMode === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentScreen('SETTINGS')} style={styles.iconBtn}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SCREEN 1: LOGIN */}
      {currentScreen === 'LOGIN' && (
        <ScrollView contentContainerStyle={styles.centerContainer}>
          <View style={[styles.card, dynamicStyles.surface]}>
            <Text style={[styles.title, dynamicStyles.text]}>Tactical Authentication</Text>
            <Text style={[styles.subtitle, dynamicStyles.mutedText]}>
              Ministry of Defence • DSSC Decision Trainer
            </Text>

            <View style={styles.quickLoginRow}>
              <Text style={[styles.label, dynamicStyles.mutedText]}>1-Tap Demo Stations:</Text>
              <View style={styles.demoButtonsGroup}>
                <TouchableOpacity
                  style={[styles.demoBtn, dynamicStyles.surface2]}
                  onPress={() => handleLogin('land1', 'trainee123')}
                >
                  <Text style={[styles.demoBtnText, dynamicStyles.text]}>Land 1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.demoBtn, dynamicStyles.surface2]}
                  onPress={() => handleLogin('air1', 'trainee123')}
                >
                  <Text style={[styles.demoBtnText, dynamicStyles.text]}>Air 1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.demoBtn, dynamicStyles.surface2]}
                  onPress={() => handleLogin('cyber1', 'trainee123')}
                >
                  <Text style={[styles.demoBtnText, dynamicStyles.text]}>Cyber 1</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* SCREEN 2: JOIN */}
      {currentScreen === 'JOIN' && (
        <ScrollView contentContainerStyle={styles.centerContainer}>
          <View style={[styles.card, dynamicStyles.surface]}>
            <Text style={[styles.title, dynamicStyles.text]}>Join Simulation</Text>
            <Text style={[styles.subtitle, dynamicStyles.mutedText]}>
              Enter 6-char exercise code from tactical instructor
            </Text>

            <TextInput
              style={[styles.codeField, dynamicStyles.surface2, dynamicStyles.text]}
              placeholder="ROOM CODE"
              placeholderTextColor={palette.muted}
              autoCapitalize="characters"
              maxLength={8}
              value={joinCode}
              onChangeText={setJoinCode}
            />

            <Text style={[styles.label, dynamicStyles.mutedText, { marginTop: 16 }]}>Select Tactical Role:</Text>
            <View style={styles.rolesRow}>
              {['LAND', 'AIR', 'CYBER', 'EW'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleChoice,
                    dynamicStyles.surface2,
                    selectedRole === r && { backgroundColor: palette.primary, borderColor: palette.primary }
                  ]}
                  onPress={() => setSelectedRole(r)}
                >
                  <Text style={[styles.roleText, dynamicStyles.text, selectedRole === r && { color: palette.primaryFg, fontWeight: '700' }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, dynamicStyles.primaryBtn]}
              onPress={handleJoin}
            >
              <Text style={[styles.actionBtnText, { color: palette.primaryFg }]}>Enter Exercise Room</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* SCREEN 3: LOBBY */}
      {currentScreen === 'LOBBY' && (
        <View style={styles.centerContainer}>
          <View style={[styles.card, dynamicStyles.surface, { alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={palette.primary} style={{ marginBottom: 16 }} />
            <Text style={[styles.title, dynamicStyles.text]}>Awaiting Exercise Launch</Text>
            <Text style={[styles.subtitle, dynamicStyles.mutedText, { textAlign: 'center' }]}>
              Tactical telemetry active for {selectedRole} station. The exercise will start automatically.
            </Text>
            <TouchableOpacity
              style={[styles.secondaryBtn, dynamicStyles.surface2]}
              onPress={() => setCurrentScreen('JOIN')}
            >
              <Text style={[styles.secondaryBtnText, dynamicStyles.text]}>Leave Room</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SCREEN 4: TACTICAL HUD */}
      {currentScreen === 'TACTICAL' && (
        <View style={styles.tacticalContainer}>
          {/* Status Strip */}
          <View style={[styles.statusStrip, dynamicStyles.surface]}>
            <View style={styles.statusLeft}>
              <Text style={[styles.statusBadge, { backgroundColor: palette.success + '20', color: palette.success }]}>
                {exerciseStatus}
              </Text>
              <Text style={[styles.statusTimer, dynamicStyles.text]}>
                T+{Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.statusRight}>
              {signalBars === 0 ? (
                <Text style={styles.commsLostBadge}>COMMS LOST</Text>
              ) : (
                <Text style={[styles.barsText, dynamicStyles.text]}>
                  {signalBars}/4 BARS ({Math.round(linkQuality * 100)}%)
                </Text>
              )}
            </View>
          </View>

          {/* Comms Feed Sheet */}
          <View style={[styles.feedSection, dynamicStyles.surface2]}>
            <Text style={[styles.feedHeader, dynamicStyles.mutedText]}>
              TACTICAL INTEL STREAM ({reports.length})
            </Text>
            <ScrollView style={{ flex: 1 }}>
              {reports.length === 0 ? (
                <Text style={[styles.emptyFeed, dynamicStyles.mutedText]}>
                  Scanning tactical frequencies for intelligence...
                </Text>
              ) : (
                reports.map((rep) => (
                  <TouchableOpacity
                    key={rep.id}
                    onPress={() => setSelectedReport(rep)}
                    style={[
                      styles.reportCard,
                      dynamicStyles.surface,
                      selectedReport?.id === rep.id && { borderColor: palette.primary, borderWidth: 2 }
                    ]}
                  >
                    <View style={styles.reportRow}>
                      <Text style={[styles.reportTitle, dynamicStyles.text]}>{rep.payload.title}</Text>
                      <Text style={[
                        styles.confChip,
                        { color: rep.confidence === 'CONFIRMED' ? palette.success : rep.confidence === 'PROBABLE' ? palette.warning : palette.danger }
                      ]}>
                        {rep.confidence}
                      </Text>
                    </View>
                    {rep.payload.detail && (
                      <Text style={[styles.reportDetail, dynamicStyles.mutedText]}>{rep.payload.detail}</Text>
                    )}
                    {rep.payload.lat && rep.payload.lon && (
                      <Text style={[styles.reportCoord, { color: palette.primary }]}>
                        COORD: {rep.payload.lat.toFixed(3)}N, {rep.payload.lon.toFixed(3)}E
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {/* Large Thumb-Friendly Decision Buttons */}
          <View style={[styles.controlsSection, dynamicStyles.surface]}>
            {selectedReport && (
              <View style={styles.respondingPill}>
                <Text style={[styles.respondingText, { color: palette.primary }]}>
                  Responding to: {selectedReport.payload.title}
                </Text>
                <TouchableOpacity onPress={() => setSelectedReport(null)}>
                  <Text style={{ color: palette.danger, fontWeight: 'bold' }}> ✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.actionsGrid}>
              {(['MOVE', 'HOLD', 'FIRE_SUPPORT', 'REQUEST_ISR', 'VERIFY', 'FALLBACK_COMMS'] as ActionType[]).map((action) => (
                <TouchableOpacity
                  key={action}
                  style={[
                    styles.thumbBtn,
                    dynamicStyles.surface2,
                    selectedAction === action && { backgroundColor: palette.primary, borderColor: palette.primary }
                  ]}
                  onPress={() => setSelectedAction(action)}
                >
                  <Text style={[
                    styles.thumbBtnText,
                    dynamicStyles.text,
                    selectedAction === action && { color: palette.primaryFg, fontWeight: '700' }
                  ]}>
                    {action.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Confidence Slider Row */}
            <View style={styles.sliderRow}>
              <Text style={[styles.sliderLabel, dynamicStyles.text]}>Confidence: {confidence}%</Text>
              <View style={styles.confButtonsGroup}>
                {[25, 50, 75, 95].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.confQuickBtn, confidence === val && { backgroundColor: palette.primary }]}
                    onPress={() => setConfidence(val)}
                  >
                    <Text style={[styles.confQuickText, dynamicStyles.text, confidence === val && { color: palette.primaryFg }]}>
                      {val}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.executeBtn, dynamicStyles.primaryBtn]}
              onPress={handleSubmitDecision}
            >
              <Text style={[styles.executeBtnText, { color: palette.primaryFg }]}>TRANSMIT ORDER</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SCREEN 5: RESULT / SCORECARD */}
      {currentScreen === 'RESULT' && scorecard && (
        <ScrollView contentContainerStyle={styles.centerContainer}>
          <View style={[styles.card, dynamicStyles.surface]}>
            <Text style={[styles.title, dynamicStyles.text]}>Tactical Performance Audit</Text>
            <Text style={[styles.subtitle, dynamicStyles.mutedText]}>
              Simulation Concluded • Officer {scorecard.user}
            </Text>

            <View style={styles.kpiGrid}>
              <View style={[styles.kpiBox, dynamicStyles.surface2]}>
                <Text style={[styles.kpiNum, { color: palette.success }]}>{scorecard.accuracy}%</Text>
                <Text style={[styles.kpiLabel, dynamicStyles.mutedText]}>Accuracy</Text>
              </View>
              <View style={[styles.kpiBox, dynamicStyles.surface2]}>
                <Text style={[styles.kpiNum, { color: palette.primary }]}>{scorecard.calibration_error.toFixed(3)}</Text>
                <Text style={[styles.kpiLabel, dynamicStyles.mutedText]}>Brier Error</Text>
              </View>
              <View style={[styles.kpiBox, dynamicStyles.surface2]}>
                <Text style={[styles.kpiNum, dynamicStyles.text]}>{scorecard.decisions}</Text>
                <Text style={[styles.kpiLabel, dynamicStyles.mutedText]}>Decisions</Text>
              </View>
              <View style={[styles.kpiBox, dynamicStyles.surface2]}>
                <Text style={[styles.kpiNum, dynamicStyles.text]}>{scorecard.used_fallback_comms}</Text>
                <Text style={[styles.kpiLabel, dynamicStyles.mutedText]}>Fallback Comms</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, dynamicStyles.primaryBtn]}
              onPress={() => setCurrentScreen('JOIN')}
            >
              <Text style={[styles.actionBtnText, { color: palette.primaryFg }]}>Return to Duty Room</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* SCREEN 6: SETTINGS */}
      {currentScreen === 'SETTINGS' && (
        <ScrollView contentContainerStyle={styles.centerContainer}>
          <View style={[styles.card, dynamicStyles.surface]}>
            <Text style={[styles.title, dynamicStyles.text]}>Station Settings</Text>

            <Text style={[styles.label, dynamicStyles.mutedText]}>Simulation Server LAN URL:</Text>
            <TextInput
              style={[styles.inputField, dynamicStyles.surface2, dynamicStyles.text]}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.50:8000"
              placeholderTextColor={palette.muted}
            />

            <TouchableOpacity
              style={[styles.actionBtn, dynamicStyles.primaryBtn, { marginTop: 12 }]}
              onPress={() => {
                AsyncStorage.setItem('degrade_server', serverUrl);
                Alert.alert('Saved', 'Server address updated.');
                setCurrentScreen(token ? 'JOIN' : 'LOGIN');
              }}
            >
              <Text style={[styles.actionBtnText, { color: palette.primaryFg }]}>Save Configuration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, dynamicStyles.surface2, { marginTop: 12 }]}
              onPress={() => {
                setToken(null);
                setUser(null);
                setCurrentScreen('LOGIN');
              }}
            >
              <Text style={[styles.secondaryBtnText, { color: palette.danger }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    height: 52,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },
  roleBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  headerRight: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 4 },
  centerContainer: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: { padding: 20, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 16 },
  codeField: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rolesRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  roleChoice: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  roleText: { fontSize: 12, fontWeight: '600' },
  actionBtn: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  secondaryBtn: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8, borderWidth: 1 },
  secondaryBtnText: { fontSize: 12, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  inputField: { padding: 10, borderRadius: 8, borderWidth: 1, fontSize: 13 },
  quickLoginRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#33333330' },
  demoButtonsGroup: { flexDirection: 'row', gap: 8, marginTop: 6 },
  demoBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  demoBtnText: { fontSize: 11, fontWeight: '600' },
  tacticalContainer: { flex: 1 },
  statusStrip: {
    height: 44,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusTimer: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
  statusRight: { flexDirection: 'row', alignItems: 'center' },
  barsText: { fontSize: 11, fontFamily: 'monospace', fontWeight: '600' },
  commsLostBadge: { fontSize: 10, fontWeight: '800', color: '#E3857A', backgroundColor: '#E3857A25', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  feedSection: { flex: 1, padding: 10 },
  feedHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  emptyFeed: { textAlign: 'center', padding: 24, fontSize: 12 },
  reportCard: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reportTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  confChip: { fontSize: 10, fontWeight: '700', marginLeft: 6 },
  reportDetail: { fontSize: 11, lineHeight: 15, marginBottom: 4 },
  reportCoord: { fontSize: 10, fontFamily: 'monospace' },
  controlsSection: { padding: 12, borderTopWidth: 1 },
  respondingPill: { flexDirection: 'row', justifyContent: 'space-between', padding: 6, backgroundColor: '#3E7C6D20', borderRadius: 6, marginBottom: 8 },
  respondingText: { fontSize: 11, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumbBtn: { width: '31%', paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  thumbBtnText: { fontSize: 10, textAlign: 'center' },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  sliderLabel: { fontSize: 12, fontWeight: '600' },
  confButtonsGroup: { flexDirection: 'row', gap: 4 },
  confQuickBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#88888820' },
  confQuickText: { fontSize: 10, fontWeight: '700' },
  executeBtn: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  executeBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  kpiBox: { width: '48%', padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  kpiNum: { fontSize: 20, fontWeight: '800', fontFamily: 'monospace' },
  kpiLabel: { fontSize: 10, marginTop: 2 },
});
