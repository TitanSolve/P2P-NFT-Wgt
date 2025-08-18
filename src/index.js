import React from 'react';
import { createRoot } from 'react-dom/client';
import { WidgetApiImpl } from '@matrix-widget-toolkit/api';
import { EventDirection, WidgetEventCapability } from 'matrix-widget-api';
import './index.css';
import App from './App';

const widgetApiPromise = WidgetApiImpl.create({
  capabilities: [
    WidgetEventCapability.forStateEvent(
      EventDirection.Receive,
      'm.room.member'
    ),
    WidgetEventCapability.forStateEvent(
      EventDirection.Receive,
      'm.room.name'
    ),
    WidgetEventCapability.forRoomEvent(
      EventDirection.Send,
      'm.room.message'
    ),
    WidgetEventCapability.forStateEvent(
      EventDirection.Send,
      'm.room.name'
    ),
    WidgetEventCapability.forStateEvent(
      EventDirection.Receive,
      'org.matrix.msc2871.theme'
    ),
  ],
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App widgetApiPromise={widgetApiPromise} />
  </React.StrictMode>
);