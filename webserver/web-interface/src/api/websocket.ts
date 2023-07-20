/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWebSocket as reactUseWebSocket } from 'react-use-websocket/dist/lib/use-websocket';
import {
  useCallback, useEffect, useState,
} from 'react';
import { Options } from 'react-use-websocket/dist/lib/types';
import useSensorStateStore from '../state/SensorStateStore';
import {
  GaggiaSettings,
  LogMessage, SensorState, ShotSnapshot, SystemState,
} from '../models/models';
import useSystemStateStore from '../state/SystemStateStore';
import useLogMessageStore from '../state/LogStore';
import useShotDataStore from '../state/ShotDataStore';
import useProfileStore from '../state/ProfileStore';
import { Profile } from '../models/profile';
import useSettingsStore from '../state/SettingsStore';

enum WsActionType {
    SensorStateUpdate = 'sensor_data_update',
    ShotSnapshotUpdate = 'shot_data_update',
    LogRecordUpdate = 'log_record',
    SystemStateUpdate = 'sys_state',
    ActiveProfileUpdated ='act_prof_update',
    SettingsUpdated ='settings_update',
}

const TIMEOUT_INTERVAL = 3000; // 3 seconds
const WS_OPTIONS: Options = {
  share: true,
  shouldReconnect: () => true,
  reconnectAttempts: 1000000,
  reconnectInterval: 3,
  retryOnError: true,
};

interface MessageData {
    action: WsActionType,
    data: unknown,
}

const useWebSocket = (url:string) => {
  const { updateSensorState } = useSensorStateStore();
  const { updateSystemState } = useSystemStateStore();
  const { addMessage } = useLogMessageStore();
  const { addShotDatapoint } = useShotDataStore();
  const { setLocalActiveProfile } = useProfileStore();
  const { updateLocalSettings } = useSettingsStore();

  const [connected, setConnected] = useState(true);
  const [messageTimeoutId, setMessageTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { lastJsonMessage, getWebSocket } = reactUseWebSocket(url, WS_OPTIONS, connected);

  // Function to reset connection
  const resetConnection = useCallback(() => {
    const webSocketInstance = getWebSocket();
    if (webSocketInstance && webSocketInstance.readyState === WebSocket.OPEN) {
      setConnected(false);
      setTimeout(() => setConnected(true), 1);
    }
  }, [getWebSocket]);

  useEffect(() => {
    if (messageTimeoutId) clearTimeout(messageTimeoutId);

    // If no message in 3 seconds, reset connection
    const timeoutId = setTimeout(resetConnection, TIMEOUT_INTERVAL);

    setMessageTimeoutId(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastJsonMessage, resetConnection]);

  useEffect(() => {
    if (!lastJsonMessage) return;

    const messageData = lastJsonMessage as unknown as MessageData;
    switch (messageData.action) {
      case WsActionType.SensorStateUpdate:
        updateSensorState(messageData.data as SensorState);
        break;
      case WsActionType.ShotSnapshotUpdate:
        addShotDatapoint(messageData.data as ShotSnapshot);
        break;
      case WsActionType.LogRecordUpdate:
        addMessage(messageData.data as LogMessage);
        break;
      case WsActionType.SystemStateUpdate:
        updateSystemState(messageData.data as SystemState);
        break;
      case WsActionType.ActiveProfileUpdated:
        setLocalActiveProfile(messageData.data as Profile);
        break;
      case WsActionType.SettingsUpdated:
        updateLocalSettings(messageData.data as GaggiaSettings);
        break;
    }
  }, [lastJsonMessage, updateLocalSettings, updateSensorState,
    updateSystemState, addMessage, addShotDatapoint, setLocalActiveProfile]);
};

export default useWebSocket;
