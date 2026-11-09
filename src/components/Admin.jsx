import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { supabase, authRedirect } from '../lib/supabase';
import {
  UserRound, Users, CalendarDays, Newspaper, Handshake, ChartColumn, Trophy, Coins, ListChecks,
  BookOpen, Lock, Crown, Vote, Compass, KeyRound, Plus, Bell, Crop, Pencil, Trash2, ArrowLeft,
  ImagePlus, Camera, Building2, Pin, MessageSquare,
} from 'lucide-react';
import { Toggle, Field, Modal, Empty, TagsInput, Ico, PubState } from './admin/ui';
import { showToast, probeColumns, pickCols, INDUSTRIES, CLUB_ROLES } from './admin/helpers';
import { KnowledgeTab } from './admin/KnowledgeTab';
import { InternalNotesTab } from './admin/InternalNotesTab';
import { RatingTab } from './admin/RatingTab';
import { PointsTab } from './admin/PointsTab';
import { PointsRulesTab } from './admin/PointsRulesTab';
import { GroupsTab } from './admin/GroupsTab';
import { OnboardingTab } from './admin/OnboardingTab';
import { ClubVotesTab } from './admin/ClubVotesTab';
import { AttendancePanel } from './admin/AttendancePanel';
import { EventArchiveEditor } from './admin/EventArchiveEditor';
import { SurveyAnalytics } from './admin/SurveyAnalytics';
import { answerText } from './admin/answers';
import { EVENT_CATEGORIES, PENALTIES, FALLBACK_RULES, loadPointsSettings, defaultPointsFor, categoryLabel } from './admin/points';
import { warmImage } from '../lib/warmImage';

// Заголовки для /api/* админки: serverless-функции проверяют access token
// сессии Supabase Auth и is_admin().
async function adminApiHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

// section — подпись группы в боковом меню; порядок вкладок прежний.
const TABS = [
  { id: 'residents',       label: 'Резиденты',        icon: UserRound,    section: 'Клуб' },
  { id: 'events',          label: 'Мероприятия',      icon: CalendarDays },
  { id: 'news',            label: 'Новости',          icon: Newspaper },
  { id: 'partners',        label: 'Партнёры',         icon: Handshake },
  { id: 'polls',           label: 'Опросы',           icon: ChartColumn,  section: 'Опросы и баллы' },
  { id: 'rating',          label: 'Рейтинг',          icon: Trophy },
  { id: 'points',          label: 'Баллы',            icon: Coins },
  { id: 'points-rules',    label: 'Правила баллов',   icon: ListChecks },
  { id: 'groups',          label: 'Группы',           icon: Users },
  { id: 'knowledge',       label: 'База знаний',      icon: BookOpen,     section: 'Материалы' },
  { id: 'internal',        label: 'Закрытый раздел',  icon: Lock },
  { id: 'president',       label: 'Президент',        icon: Crown },
  { id: 'club-votes',      label: 'Голосования',      icon: Vote,         section: 'Управление' },
  { id: 'onboarding',      label: 'Онбординг',        icon: Compass },
  { id: 'access-requests', label: 'Заявки на доступ', icon: KeyRound },
];

const PARTNER_CATS = [
  { value: 'restaurant', label: 'Рестораны' },
  { value: 'fitness',    label: 'Фитнес' },
  { value: 'beauty',     label: 'Красота' },
  { value: 'travel',     label: 'Путешествия' },
  { value: 'education',  label: 'Образование' },
  { value: 'finance',    label: 'Финансы' },
  { value: 'other',      label: 'Другое' },
];

const POLL_TYPES = [
  { value: 'single',   label: 'Один вариант' },
  { value: 'multiple', label: 'Несколько вариантов' },
  { value: 'text',     label: 'Текстовый ответ' },
  { value: 'rating',   label: 'Оценка по шкале' },
  { value: 'nps',      label: 'NPS 0–10' },
];

const SURVEY_KINDS = [
  { value: 'poll',         label: 'Голосование' },
  { value: 'pre_board',    label: 'Анкета перед СД' },
  { value: 'pre_forum',    label: 'Анкета перед Форумом' },
  { value: 'registration', label: 'Регистрация / подтверждение участия' },
  { value: 'requests',     label: 'Сбор запросов на мероприятия' },
  { value: 'nps',          label: 'NPS' },
  { value: 'feedback',     label: 'Обратная связь после мероприятия' },
  { value: 'other',        label: 'Другое' },
];

// Вопрос-подтверждение анкеты «Регистрация»: порядок вариантов важен —
// submit_survey превращает 0/1/2 в going / not_going / maybe.
const RSVP_QUESTION = {
  question: 'Подтверждаете участие?',
  type: 'single',
  options: ['Иду', 'Не иду', 'Возможно'],
  is_required: true,
  is_active: true,
  rsvp_link: true,
  sort_order: 0,
};

const AUDIENCES = [
  { value: 'all',      label: 'Всем резидентам' },
  { value: 'selected', label: 'Выбранным резидентам' },
  { value: 'event',    label: 'Участникам мероприятия' },
  { value: 'group',    label: 'Группе / Форуму' },
];

const toLocalInput = d => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* Клубный вечер: графит, латунь, плотная бумага. Поверхности — нейтральный
     графит; латунь (#d4a853, цвет приложения) — единственный акцент:
     основная кнопка, выбранный пункт меню, одна ключевая цифра и точка
     «опубликовано / идёт сейчас». */
  :root {
    --bg:        #141415;
    --s0:        #0f0f10;
    --s1:        #19191b;
    --s2:        #232325;
    --s3:        #2c2c2f;
    --border:    rgba(237,237,237,0.08);
    --border-2:  rgba(237,237,237,0.14);
    --text:      #ededed;
    --text-2:    #a1a1a6;
    --muted:     #85858b;
    --gold:      #d4a853;
    --gold-dim:  rgba(212,168,83,0.12);
    --on-gold:   #1b1508;
    --danger:    #e5484d;
    --danger-bg: rgba(229,72,77,0.10);
    --success:   #4cc38a;
    --r:         12px;
    --ease:      cubic-bezier(0.22, 1, 0.36, 1);
    --font:      'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --mono:      'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  }

  body {
    background: var(--bg); color: var(--text);
    font-family: var(--font); font-size: 14px; line-height: 20px;
    font-variant-numeric: tabular-nums; min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  b, strong { font-weight: 500; }
  code, .mono { font-family: var(--mono); font-size: 12px; font-variant-numeric: tabular-nums; }
  code { color: var(--text-2); }
  input[type=checkbox], input[type=radio] { accent-color: var(--text); width: 16px; height: 16px; flex-shrink: 0; }
  :focus-visible { outline: 2px solid rgba(237,237,237,0.5); outline-offset: 2px; }

  /* ── Layout ── */
  .admin-app { display: flex; flex-direction: column; min-height: 100vh; }

  .topbar {
    position: sticky; top: 0; z-index: 50;
    background: var(--s0); border-bottom: 1px solid var(--border);
    padding: 0 24px 0 20px; height: 56px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .topbar-brand { display: flex; align-items: baseline; gap: 8px; font-size: 15px; font-weight: 600; color: var(--text); }
  .topbar-brand span { font-size: 13px; font-weight: 400; color: var(--muted); }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .topbar-user { font-size: 13px; color: var(--text-2); }
  .topbar-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); text-decoration: none; transition: color 150ms var(--ease); }
  .topbar-link:hover { color: var(--text); }

  .sidebar {
    position: fixed; left: 0; top: 56px; bottom: 0; width: 240px;
    background: var(--s0); border-right: 1px solid var(--border);
    padding: 8px 12px 24px; display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto;
  }
  .sidebar-label { font-size: 12px; line-height: 16px; color: var(--muted); padding: 20px 8px 6px; }
  .sidebar-label:first-child { padding-top: 12px; }
  .sidebar-btn {
    display: flex; align-items: center; gap: 10px;
    height: 32px; padding: 0 8px; border-radius: 8px; flex-shrink: 0;
    border: none; background: none; color: var(--text-2);
    font: inherit; font-size: 13px; cursor: pointer;
    text-align: left; width: 100%;
    transition: background-color 150ms var(--ease), color 150ms var(--ease);
  }
  .sidebar-btn svg { color: var(--muted); flex-shrink: 0; transition: color 150ms var(--ease); }
  .sidebar-btn:hover { color: var(--text); background: rgba(237,237,237,0.04); }
  .sidebar-btn.active { color: var(--text); background: var(--s2); box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }
  .sidebar-btn.active svg { color: var(--gold); }

  .main { margin-left: 240px; padding: 32px; min-height: calc(100vh - 56px); }
  .main-inner { max-width: 1400px; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    height: 36px; padding: 0 16px; border-radius: 8px; border: 1px solid transparent;
    font-family: inherit; font-size: 13px; font-weight: 500; line-height: 1; white-space: nowrap;
    cursor: pointer; color: var(--text); background: none;
    text-transform: none; letter-spacing: 0;
    transition: background-color 150ms var(--ease), border-color 150ms var(--ease), color 150ms var(--ease), opacity 150ms var(--ease), transform 120ms var(--ease);
  }
  /* Глобальный .btn лендинга (index.css) растягивает трекинг и масштабирует на hover — гасим в админке */
  .btn:hover { letter-spacing: 0; transform: none; }
  .btn:active { transform: scale(.98); }
  .btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .btn-gold { background: var(--gold); color: var(--on-gold); box-shadow: inset 0 1px 0 rgba(255,255,255,0.2); }
  .btn-gold:hover:not(:disabled) { background: #ddb563; }
  .btn-outline { border-color: var(--border-2); color: var(--text); }
  .btn-outline:hover:not(:disabled) { background: var(--s2); }
  .btn-danger { border-color: var(--border-2); color: var(--text-2); }
  .btn-danger:hover:not(:disabled) { color: var(--danger); border-color: rgba(229,72,77,0.4); background: var(--danger-bg); }
  .btn-ghost { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: var(--muted); cursor: pointer; font-family: inherit; font-size: 13px; border-radius: 6px; transition: color 150ms var(--ease); }
  .btn-ghost:hover { color: var(--text); }
  .btn-sm { height: 28px; padding: 0 12px; font-size: 12px; border-radius: 6px; gap: 6px; }
  .btn-xs { height: 24px; padding: 0 8px; font-size: 12px; border-radius: 6px; gap: 4px; }
  .btn-wide { width: 100%; height: 40px; }
  .btn-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 6px; border: none; background: none;
    color: var(--muted); cursor: pointer; flex-shrink: 0;
    transition: background-color 150ms var(--ease), color 150ms var(--ease);
  }
  .btn-icon:hover:not(:disabled) { background: var(--s2); color: var(--text); }
  .btn-icon.danger:hover:not(:disabled) { color: var(--danger); background: var(--danger-bg); }
  .btn-icon:disabled { opacity: .35; cursor: not-allowed; }
  .btn-icon.sm { width: 24px; height: 24px; }

  /* Сегменты: переключатели разделов и фильтров */
  .seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 2px; border-radius: 8px; background: var(--s0); border: 1px solid var(--border); }
  .seg-btn {
    height: 28px; padding: 0 12px; border-radius: 6px; border: none; background: none;
    font: inherit; font-size: 12px; color: var(--text-2); cursor: pointer; white-space: nowrap;
    transition: background-color 150ms var(--ease), color 150ms var(--ease);
  }
  .seg-btn:hover { color: var(--text); }
  .seg-btn.on { background: var(--s2); color: var(--text); box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }

  /* Отметки-переключатели (явка): нейтральные, «on» — шаг поверхности */
  .chip {
    display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px;
    border-radius: 6px; border: 1px solid var(--border); background: none;
    font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; white-space: nowrap;
    transition: background-color 150ms var(--ease), color 150ms var(--ease), border-color 150ms var(--ease);
  }
  .chip:hover:not(:disabled) { color: var(--text); border-color: var(--border-2); }
  .chip.on { background: var(--s3); border-color: var(--border-2); color: var(--text); }
  .chip.on-bad { background: var(--danger-bg); border-color: rgba(229,72,77,0.4); color: var(--danger); }
  .chip:disabled { opacity: .5; cursor: wait; }

  /* ── Section header ── */
  .section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
  .section-title { font-size: 24px; line-height: 32px; font-weight: 500; letter-spacing: 0; font-family: var(--font); }
  .section-title.sm { font-size: 16px; line-height: 24px; margin-bottom: 12px; }
  .section-sub { color: var(--text-2); font-size: 13px; margin-top: 4px; max-width: 680px; }
  .section-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
  .toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  .toolbar .grow { flex: 1; }
  .search { max-width: 320px; }

  /* ── Cards ── */
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
  .card { background: var(--s1); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; transition: border-color 150ms var(--ease); }
  .card.tight { padding: 12px; }

  /* ── Resident grid: тихие карточки, говорят лица ── */
  .res-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr)); gap: 16px; }
  .res-card { display: flex; flex-direction: column; background: var(--s1); border: 1px solid var(--border); border-radius: var(--r); padding: 4px; transition: border-color 150ms var(--ease); }
  .res-card:hover { border-color: var(--border-2); }
  .res-photo {
    display: block; width: 100%; aspect-ratio: 0.86; border: none; padding: 0; cursor: pointer;
    border-radius: 8px; overflow: hidden; background: var(--s2);
  }
  .res-photo img { width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity 150ms var(--ease); }
  .res-card.is-hidden .res-photo img { opacity: .45; }
  .res-photo-ph { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-size: 12px; }
  .res-body { padding: 12px 8px 8px; min-width: 0; }
  .res-name { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .res-company { font-size: 13px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .res-meta { font-size: 12px; line-height: 16px; color: var(--muted); margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .res-foot { display: flex; align-items: center; gap: 8px; margin-top: auto; padding: 8px; border-top: 1px solid var(--border); }
  .res-foot .grow { flex: 1; }

  /* ── Table ── */
  .tbl-wrap { border-radius: var(--r); border: 1px solid var(--border); background: var(--s1); overflow: hidden; }
  .tbl-wrap.scroll { overflow-y: auto; }
  .tbl-caption { padding: 12px 16px; font-size: 13px; font-weight: 500; color: var(--text); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .tbl-caption .hint { font-weight: 400; }
  table { width: 100%; border-collapse: collapse; }
  th { color: var(--muted); font-size: 12px; font-weight: 400; text-align: left; height: 36px; padding: 0 16px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tbody tr { transition: background-color 150ms var(--ease); }
  tbody tr:hover td { background: rgba(237,237,237,0.02); }
  .td-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: nowrap; }
  @media (max-width: 1200px) { .td-actions { flex-wrap: wrap; } }
  .td-date { font-family: var(--mono); font-size: 12px; color: var(--text-2); white-space: nowrap; }
  .td-num { font-family: var(--mono); font-size: 13px; white-space: nowrap; }
  .tbl-empty { text-align: center; padding: 32px 16px; color: var(--muted); font-size: 13px; }
  .tr-test td:first-child { box-shadow: inset 2px 0 0 var(--danger); }
  .tr-test td { opacity: .6; }
  .cell-title { font-weight: 500; }
  .cell-sub { font-size: 12px; line-height: 16px; color: var(--muted); margin-top: 2px; }
  .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .thumb { width: 56px; height: 40px; object-fit: cover; border-radius: 6px; display: block; }
  .thumb-ph { width: 56px; height: 40px; border-radius: 6px; background: var(--s2); display: flex; align-items: center; justify-content: center; color: var(--muted); }

  /* ── Badges: тихий текст на шаге поверхности ── */
  .badge { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 6px; border-radius: 4px; font-size: 12px; font-weight: 400; white-space: nowrap; background: rgba(237,237,237,0.06); color: var(--text-2); }
  .badge-gray, .badge-gold { background: rgba(237,237,237,0.06); color: var(--text-2); }
  .badge-green { background: none; color: var(--success); padding: 0; }
  .badge-red { background: var(--danger-bg); color: var(--danger); }
  .badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }

  /* ── Подпись продукта: латунная точка «опубликовано / идёт сейчас» ── */
  .status { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); white-space: nowrap; }
  .status .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); flex-shrink: 0; }
  .status.off { color: var(--muted); }
  .status.off .dot { background: none; box-shadow: inset 0 0 0 1px var(--muted); }
  .pub-cell { display: flex; align-items: center; gap: 12px; }
  .verdict { font-size: 12px; color: var(--text-2); white-space: nowrap; }
  .verdict.ok { color: var(--success); }
  .verdict.bad { color: var(--danger); }

  /* ── Toggle switch ── */
  .toggle { position: relative; display: inline-block; width: 32px; height: 20px; cursor: pointer; flex-shrink: 0; }
  .toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
  .toggle-track { position: absolute; inset: 0; border-radius: 10px; background: var(--s3); box-shadow: inset 0 0 0 1px var(--border); transition: background-color 150ms var(--ease); }
  .toggle input:checked + .toggle-track { background: var(--text); }
  .toggle input:focus-visible + .toggle-track { outline: 2px solid rgba(237,237,237,0.5); outline-offset: 2px; }
  .toggle-thumb { position: absolute; left: 3px; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: var(--text-2); transition: transform 150ms var(--ease), background-color 150ms var(--ease); pointer-events: none; }
  .toggle input:checked ~ .toggle-thumb { transform: translateX(12px); background: var(--bg); }

  /* ── Form ── */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-grid .full { grid-column: 1/-1; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field > label { font-size: 12px; line-height: 16px; color: var(--text-2); }
  .field-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  input[type=text], input[type=date], input[type=email], input[type=password],
  input[type=url], input[type=tel], input[type=datetime-local], input[type=time],
  input[type=number], select, textarea {
    background: var(--s2); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); height: 36px; padding: 0 12px; font-size: 14px; line-height: 20px;
    font-family: inherit; width: 100%; outline: none; color-scheme: dark;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  input::placeholder, textarea::placeholder { color: var(--muted); }
  input:focus, select:focus, textarea:focus { border-color: rgba(237,237,237,0.32); box-shadow: 0 0 0 3px rgba(237,237,237,0.06); }
  input:disabled, select:disabled, textarea:disabled { opacity: .5; cursor: not-allowed; }
  textarea { height: auto; padding: 8px 12px; resize: vertical; min-height: 80px; }
  textarea.doc { min-height: 360px; line-height: 22px; }
  select {
    appearance: none; -webkit-appearance: none; padding-right: 32px; cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2385858b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
  }
  select option { background: var(--s2); }
  input[type=range] { accent-color: var(--text); }
  .check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-2); cursor: pointer; }
  .check-row { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; padding: 8px 0; }
  .hint { font-size: 12px; line-height: 16px; color: var(--muted); }
  .hint.err { color: var(--danger); }
  .note { font-size: 12px; line-height: 18px; color: var(--muted); }
  .divider { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }
  .sub-head { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 12px; display: block; }

  /* Списки выбора внутри модалок */
  .picker { overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 4px; background: var(--s0); }
  .picker-row { display: flex; gap: 12px; align-items: center; min-height: 36px; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: background-color 150ms var(--ease); }
  .picker-row:hover { background: rgba(237,237,237,0.04); }
  .list { display: flex; flex-direction: column; gap: 4px; }
  .list-row { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 8px 12px; border-radius: 8px; background: var(--s2); border: 1px solid var(--border); }
  .list-row .idx { font-family: var(--mono); font-size: 12px; color: var(--muted); min-width: 20px; }

  /* ── Modal ── */
  .overlay { position: fixed; inset: 0; background: rgba(8,8,9,0.72); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; animation: fade-in 200ms var(--ease); }
  .modal {
    background: var(--s1); border: 1px solid var(--border); border-radius: 16px; padding: 24px;
    width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto;
    display: flex; flex-direction: column; gap: 16px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.45);
    animation: rise-in 220ms var(--ease);
  }
  .modal.wide { max-width: 880px; }
  .modal-title { font-size: 16px; line-height: 24px; font-weight: 500; }
  .modal-footer { display: flex; gap: 8px; justify-content: flex-end; padding-top: 8px; }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rise-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .crop-box { position: relative; width: 100%; height: 360px; background: #000; border-radius: 8px; overflow: hidden; }

  /* ── Upload area ── */
  .upload-area { border: 1px dashed var(--border-2); border-radius: var(--r); padding: 24px; text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--muted); transition: border-color 150ms var(--ease), background-color 150ms var(--ease); }
  .upload-area:hover { border-color: rgba(237,237,237,0.3); background: rgba(237,237,237,0.02); }
  .upload-area img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; }
  .upload-area img.cover { width: 100%; height: 160px; }
  .upload-area p { font-size: 12px; color: var(--muted); }

  /* ── Options builder ── */
  .option-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
  .option-row input { flex: 1; }
  .add-option { display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: none; border: 1px dashed var(--border-2); color: var(--text-2); border-radius: 8px; height: 32px; padding: 0 12px; font-size: 12px; width: 100%; margin-top: 4px; cursor: pointer; transition: background-color 150ms var(--ease), color 150ms var(--ease); font-family: inherit; }
  .add-option:hover { background: var(--s2); color: var(--text); }

  /* ── President ── */
  .president-wrap { display: flex; gap: 24px; align-items: flex-start; }
  .president-photo { width: 120px; height: 152px; border-radius: 8px; object-fit: cover; background: var(--s2); cursor: pointer; flex-shrink: 0; }
  .president-photo-ph { width: 120px; height: 152px; border-radius: 8px; background: var(--s2); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border: 1px dashed var(--border-2); flex-shrink: 0; gap: 8px; color: var(--muted); font-size: 12px; }

  /* ── Banner / notices ── */
  .banner { display: flex; gap: 12px; align-items: flex-start; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; line-height: 20px; border: 1px solid var(--border); background: var(--s2); color: var(--text-2); }
  .banner svg { flex-shrink: 0; margin-top: 2px; color: var(--muted); }
  .banner.red { border-color: rgba(229,72,77,0.3); background: var(--danger-bg); color: var(--text); }
  .banner.red svg { color: var(--danger); }

  /* ── Stats: подписи и цифры ── */
  .stats { display: flex; gap: 32px; flex-wrap: wrap; }
  .stat-value { font-size: 24px; line-height: 32px; font-weight: 500; font-family: var(--mono); letter-spacing: -0.01em; }
  .stat-value.key { color: var(--gold); }
  .stat-label { font-size: 12px; line-height: 16px; color: var(--muted); }
  .stat-grid { display: grid; gap: 12px; }
  .stat-grid .card { padding: 16px; }
  .meta-line { display: flex; gap: 8px 16px; flex-wrap: wrap; font-size: 12px; color: var(--text-2); }
  .meta-line b { font-family: var(--mono); font-weight: 500; color: var(--text); }

  /* ── Явка и кворум (голосования) ── */
  .turnout { display: flex; flex-direction: column; gap: 6px; min-width: 148px; }
  .turnout-figure { font-family: var(--mono); font-size: 13px; }
  .turnout-figure span { color: var(--muted); }
  .turnout-bar { position: relative; height: 4px; border-radius: 2px; background: var(--s3); }
  .turnout-bar.lg { height: 8px; border-radius: 4px; }
  .turnout-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: inherit; background: var(--text-2); }
  .turnout-fill.live { background: var(--gold); }
  .turnout-quorum { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--text); }
  .turnout-bar.lg .turnout-quorum { top: -6px; bottom: -6px; }
  .turnout-note { font-size: 12px; line-height: 16px; color: var(--muted); }
  .turnout-note .ok { color: var(--success); }
  .quorum-scale { position: relative; height: 16px; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
  .quorum-scale span { position: absolute; transform: translateX(-50%); white-space: nowrap; }

  /* Полосы распределения ответов */
  .bars { display: flex; flex-direction: column; gap: 8px; }
  .bar-row { display: grid; grid-template-columns: minmax(80px, 38%) 1fr 80px; gap: 12px; align-items: center; font-size: 12px; }
  .bar-track { height: 6px; border-radius: 3px; background: var(--s3); overflow: hidden; }
  .bar-fill { height: 100%; border-radius: inherit; background: var(--text-2); }
  .bar-num { font-family: var(--mono); color: var(--muted); text-align: right; }

  .stat-pill { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px; font-size: 12px; border-radius: 6px; background: rgba(237,237,237,0.04); border: 1px solid var(--border); color: var(--text-2); white-space: nowrap; font-family: inherit; }
  button.stat-pill { cursor: pointer; transition: background-color 150ms var(--ease), color 150ms var(--ease); }
  button.stat-pill:hover { background: var(--s2); color: var(--text); }
  .stat-pill b { font-family: var(--mono); font-weight: 500; color: var(--text); }

  .checklist { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-bottom: 16px; }
  .check-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
  .check-item.ok { color: var(--text); }
  .check-item.ok svg { color: var(--success); }

  /* ── Toast ── */
  .toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; padding: 12px 16px; border-radius: 8px; background: var(--s2); border: 1px solid var(--border-2); color: var(--text); font-size: 13px; opacity: 0; transform: translateY(8px); transition: opacity 200ms var(--ease), transform 200ms var(--ease); pointer-events: none; max-width: 360px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); }
  .toast.show { opacity: 1; transform: translateY(0); }
  .toast.err { border-color: rgba(229,72,77,0.45); color: var(--danger); }

  /* ── Empty / Loading ── */
  .empty { grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding: 64px 20px; color: var(--muted); font-size: 13px; }
  .empty-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--s1); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--muted); }
  .loading { text-align: center; padding: 40px; color: var(--muted); }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border-2); border-top-color: var(--text-2); border-radius: 50%; animation: spin .7s linear infinite; vertical-align: -3px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Login ── */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 24px; }
  .login-card { width: 360px; max-width: 100%; background: var(--s1); border: 1px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column; gap: 24px; }
  .login-head { display: flex; flex-direction: column; gap: 4px; }
  .login-logo { font-size: 18px; line-height: 24px; font-weight: 600; color: var(--text); }
  .login-sub { font-size: 13px; color: var(--text-2); }
  .login-form { display: flex; flex-direction: column; gap: 16px; }
  .login-msg { font-size: 13px; text-align: center; line-height: 20px; }
  .login-msg.err { color: var(--danger); }
  .login-msg.ok { color: var(--text-2); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
  }

  /* Мобильный: меню — горизонтальная лента под шапкой */
  @media (max-width: 768px) {
    .topbar { padding: 0 16px; }
    .topbar-brand span, .topbar-user { display: none; }
    .sidebar {
      position: sticky; top: 56px; z-index: 40; width: 100%; height: auto;
      flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 8px 12px;
      border-right: none; border-bottom: 1px solid var(--border);
    }
    .sidebar-label { display: none; }
    .sidebar-btn { width: auto; white-space: nowrap; }
    .main { margin-left: 0; padding: 20px 16px; }
    .section-head { flex-direction: column; }
    .form-grid { grid-template-columns: 1fr; }
    .form-grid .full { grid-column: 1; }
    .tbl-wrap { overflow-x: auto; }
    .president-wrap { flex-direction: column; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function uploadImage(file, folder = 'misc') {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  warmImage(data.publicUrl);
  return data.publicUrl;
}

// ─── Image cropping ───────────────────────────────────────────────────────────

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc, cropPixels, mimeType = 'image/jpeg') {
  const img = await loadImageEl(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    img,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height,
  );
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), mimeType, 0.92));
}

/** Crop/zoom modal — takes a raw File, resolves a cropped File via onDone. */
const CropModal = ({ file, aspect = 3 / 4, onCancel, onDone }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const confirm = async () => {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      onDone(croppedFile);
    } finally {
      setBusy(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <div className="overlay" style={{ zIndex: 300 }} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-title">Кадрировать фото</div>
        <div className="crop-box">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="hint">Масштаб</span>
          <input
            type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Отмена</button>
          <button className="btn btn-gold" onClick={confirm} disabled={busy}>{busy ? 'Обработка…' : 'Готово'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── RESIDENTS TAB ────────────────────────────────────────────────────────────

const RESIDENT_NEW_COLS = ['club_role', 'industry_group', 'hobbies', 'contacts_public'];
// Явный список колонок вместо select('*'): login_password в браузер не грузим
// (пароль только задаётся/меняется, но не читается).
const RESIDENT_BASE_COLS = ['id', 'name', 'company', 'niche', 'photo_url', 'phone', 'website', 'brief',
  'turnover', 'employees', 'member_since', 'partner_companies', 'achievements',
  'is_president', 'is_published', 'sort_order'];

const ResidentsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cropSource, setCropSource] = useState(null); // raw File pending crop
  const [cols, setCols] = useState(new Set()); // новые колонки из миграции modernization_stage1
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    const present = await probeColumns(supabase, 'residents', RESIDENT_NEW_COLS);
    const select = [...RESIDENT_BASE_COLS, ...RESIDENT_NEW_COLS.filter(c => present.has(c))].join(',');
    const { data, error } = await supabase.from('residents').select(select).order('sort_order');
    if (error) showToast('Ошибка загрузки: ' + error.message, 'err');
    setRows(data || []);
    setCols(present);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ name: '', company: '', niche: '', phone: '', login_password: '', website: '', brief: '', turnover: '', employees: '', member_since: '', partner_companies: '', achievements: '', is_president: false, is_published: true, sort_order: rows.length + 1, club_role: '', industry_group: '', hobbies: [], contacts_public: false });

  const openNew = () => { setForm(blank()); setImageFile(null); setImagePreview(null); setModal('new'); };
  const openEdit = r => {
    setForm({
      ...r,
      partner_companies: Array.isArray(r.partner_companies) ? r.partner_companies.join(', ') : '',
      achievements: Array.isArray(r.achievements) ? r.achievements.join('\n') : '',
      hobbies: Array.isArray(r.hobbies) ? r.hobbies : [],
    });
    setImageFile(null); setImagePreview(r.photo_url || null); setModal(r);
  };
  const close = () => { setModal(null); setForm({}); setImageFile(null); setImagePreview(null); };

  const onFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setCropSource(f);
    e.target.value = ''; // allow picking the same file again later
  };

  const onCropDone = croppedFile => {
    setImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    setCropSource(null);
  };

  const save = async () => {
    if (!form.name?.trim()) return showToast('Введите имя', 'err');
    setSaving(true);
    try {
      let photo_url = form.photo_url || null;
      if (imageFile) photo_url = await uploadImage(imageFile, 'residents');

      // If set as president, unset others
      if (form.is_president) await supabase.from('residents').update({ is_president: false }).neq('id', form.id || 'none');

      const partnerCompanies = (form.partner_companies || '').split(',').map(s => s.trim()).filter(Boolean);
      const achievements = (form.achievements || '').split('\n').map(s => s.trim()).filter(Boolean);

      const payload = pickCols({
        club_role: form.club_role?.trim() || null,
        industry_group: form.industry_group || null,
        hobbies: Array.isArray(form.hobbies) ? form.hobbies : [],
        contacts_public: !!form.contacts_public,
        name: form.name, company: form.company || null, niche: form.niche || null, photo_url,
        phone: form.phone || null,
        // Пароль не загружается в форму: пустое поле при редактировании = не менять.
        ...(form.login_password ? { login_password: form.login_password } : (modal === 'new' ? { login_password: null } : {})),
        website: form.website || null, brief: form.brief || null,
        turnover: form.turnover || null, employees: form.employees || null,
        member_since: form.member_since ? parseInt(form.member_since) : null,
        partner_companies: partnerCompanies, achievements,
        is_president: !!form.is_president, is_published: form.is_published !== false, sort_order: form.sort_order || 0,
      }, RESIDENT_NEW_COLS, cols);

      const { error } = modal === 'new'
        ? await supabase.from('residents').insert(payload)
        : await supabase.from('residents').update(payload).eq('id', form.id);
      if (error) throw error;

      showToast(modal === 'new' ? 'Резидент добавлен' : 'Сохранено');
      close(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async id => {
    if (!confirm('Удалить резидента?')) return;
    await supabase.from('residents').delete().eq('id', id);
    showToast('Удалено'); load();
  };

  const togglePub = async (id, val) => {
    await supabase.from('residents').update({ is_published: val }).eq('id', id);
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: val } : x));
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Резиденты</div>
          <div className="section-sub">{rows.length} участников</div>
        </div>
        <button className="btn btn-gold" onClick={openNew}><Ico i={Plus} /> Добавить</button>
      </div>

      <div className="res-grid">
        {rows.map(r => {
          const meta = [
            r.is_president && 'Президент',
            r.club_role && !(r.is_president && r.club_role === 'Президент') && r.club_role,
            r.industry_group,
            r.niche,
          ].filter(Boolean).join(' · ');
          return (
            <div key={r.id} className={`res-card${r.is_published ? '' : ' is-hidden'}`}>
              <button type="button" className="res-photo" onClick={() => openEdit(r)} aria-label={`Редактировать: ${r.name}`}>
                {r.photo_url
                  ? <img src={r.photo_url} alt={r.name} loading="lazy" />
                  : <span className="res-photo-ph"><Ico i={UserRound} />Нет фото</span>}
              </button>
              <div className="res-body">
                <div className="res-name">{r.name}</div>
                <div className="res-company">{r.company || '—'}</div>
                {meta && <div className="res-meta">{meta}</div>}
              </div>
              <div className="res-foot">
                <Toggle checked={r.is_published} onChange={v => togglePub(r.id, v)} />
                <PubState on={r.is_published} onLabel="Опубликован" offLabel="Скрыт" />
                <span className="grow" />
                <button className="btn-icon" title="Редактировать" aria-label="Редактировать" onClick={() => openEdit(r)}><Ico i={Pencil} /></button>
                <button className="btn-icon danger" title="Удалить" aria-label="Удалить" onClick={() => remove(r.id)}><Ico i={Trash2} /></button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <Empty icon={UserRound} text="Резиденты не добавлены" />}
      </div>

      {cropSource && (
        <CropModal
          file={cropSource}
          /* Ровно соотношение карточки резидента в приложении (childAspectRatio
             0.86) — что кадрируешь, то и видно в приложении. */
          aspect={0.86}
          onCancel={() => setCropSource(null)}
          onDone={onCropDone}
        />
      )}

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Добавить резидента' : 'Редактировать'} onClose={close} onSave={save} saving={saving}>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
          <div className="upload-area" onClick={() => fileRef.current.click()}>
            {imagePreview ? <img src={imagePreview} alt="" /> : <Ico i={Camera} />}
            <p>{imageFile ? imageFile.name : 'Нажмите, чтобы выбрать фото'}</p>
          </div>
          {imagePreview && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => {
                if (imageFile) { setCropSource(imageFile); return; }
                fetch(imagePreview)
                  .then(r => r.blob())
                  .then(b => setCropSource(new File([b], 'photo.jpg', { type: b.type || 'image/jpeg' })))
                  .catch(() => showToast('Не удалось загрузить фото для кадрирования', 'err'));
              }}
            >
              <Ico i={Crop} /> Перекадрировать
            </button>
          )}
          <div className="form-grid">
            <div className="field full"><label>Имя *</label><input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Тимур Нуртаев" /></div>
            <Field label="Компания"><input type="text" value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="TIMUS Development" /></Field>
            <Field label="Ниша"><input type="text" value={form.niche || ''} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} placeholder="Строительство" /></Field>
            <Field label="Телефон"><input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+7 702 666 6113" /></Field>
            <Field label="Пароль для входа"><input type="text" value={form.login_password || ''} onChange={e => setForm(f => ({ ...f, login_password: e.target.value }))} placeholder={modal === 'new' ? 'пароль резидента для входа в приложение' : 'новый пароль (пусто = не менять)'} /></Field>
            <div className="field full"><label>Сайт</label><input type="url" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.kz" /></div>
            <div className="field full"><label>О резиденте</label><textarea value={form.brief || ''} onChange={e => setForm(f => ({ ...f, brief: e.target.value }))} rows={3} /></div>

            <Field label="Оборот"><input type="text" value={form.turnover || ''} onChange={e => setForm(f => ({ ...f, turnover: e.target.value }))} placeholder="2 млрд ₸ / год" /></Field>
            <Field label="Команда"><input type="text" value={form.employees || ''} onChange={e => setForm(f => ({ ...f, employees: e.target.value }))} placeholder="120 сотрудников" /></Field>
            <Field label="Год вступления"><input type="text" value={form.member_since || ''} onChange={e => setForm(f => ({ ...f, member_since: e.target.value }))} placeholder="2024" /></Field>
            <div className="field full"><label>Компании-партнёры</label><textarea value={form.partner_companies || ''} onChange={e => setForm(f => ({ ...f, partner_companies: e.target.value }))} rows={2} placeholder="Через запятую: Kaspi, Halyk Bank, Kcell" /></div>
            <div className="field full"><label>Достижения</label><textarea value={form.achievements || ''} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} rows={3} placeholder={'По одному в строке:\nForbes 30 under 30 (2023)\n3 успешных экзита'} /></div>

            {cols.size < RESIDENT_NEW_COLS.length && (
              <div className="field full hint err">
                Поля «Роль в клубе», «Отрасль», «Увлечения», «Согласие на контакты» появятся после миграции 2026-11-09_modernization_stage1.sql
              </div>
            )}
            {cols.has('club_role') && (
              <Field label="Роль в клубе">
                <input type="text" list="club-roles" value={form.club_role || ''} onChange={e => setForm(f => ({ ...f, club_role: e.target.value }))} placeholder="Офицер по мероприятиям" />
                <datalist id="club-roles">{CLUB_ROLES.map(r => <option key={r} value={r} />)}</datalist>
              </Field>
            )}
            {cols.has('industry_group') && (
              <Field label="Отрасль (для фильтра в приложении)">
                <select value={form.industry_group || ''} onChange={e => setForm(f => ({ ...f, industry_group: e.target.value }))}>
                  <option value="">— не выбрана (определится по нише) —</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
            )}
            {cols.has('hobbies') && (
              <div className="field full"><label>Увлечения</label>
                <TagsInput value={form.hobbies} onChange={v => setForm(f => ({ ...f, hobbies: v }))} placeholder="Гольф, теннис… — Enter или запятая" />
              </div>
            )}
            {cols.has('contacts_public') && (
              <label className="full check-label">
                <input type="checkbox" checked={!!form.contacts_public} onChange={e => setForm(f => ({ ...f, contacts_public: e.target.checked }))} />
                Согласие показывать контакты резидентам
              </label>
            )}

            <Field label="Порядок сортировки"><input type="text" value={form.sort_order || ''} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></Field>
            <div className="check-row">
              <label className="check-label">
                <Toggle checked={!!form.is_president} onChange={v => setForm(f => ({ ...f, is_president: v }))} /> Президент
              </label>
              <label className="check-label">
                <Toggle checked={form.is_published !== false} onChange={v => setForm(f => ({ ...f, is_published: v }))} /> Опубликован
              </label>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── EVENTS TAB ───────────────────────────────────────────────────────────────


const EventsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [rsvps, setRsvps] = useState(null); // null = not loaded, [] = loaded empty
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [reminderEvent, setReminderEvent] = useState(null);
  const [recipientMode, setRecipientMode] = useState('all');
  const [reminderResidents, setReminderResidents] = useState([]);
  const [selectedResidentIds, setSelectedResidentIds] = useState([]);
  const [rules, setRules] = useState(FALLBACK_RULES);   // правила баллов из «Правил баллов»
  const [groups, setGroups] = useState([]);              // resident_groups для group_id
  const [hasGroupCol, setHasGroupCol] = useState(false); // events.group_id (modernization_stage1)
  const fileRef = useRef();

  useEffect(() => { loadPointsSettings().then(setRules); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, g, present] = await Promise.all([
      supabase.from('events').select('*').order('date', { ascending: false }),
      supabase.from('resident_groups').select('id,name').order('sort_order').order('name'),
      probeColumns(supabase, 'events', ['group_id']),
    ]);
    setRows(data || []);
    setGroups(g.error ? [] : (g.data || []));
    setHasGroupCol(present.has('group_id'));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ title: '', description: '', date: '', time: '', location: '', speaker_name: '', speaker_role: '', capacity: '', tags: '', is_published: true, category: 'business', points: rules.business, champion_points: rules.champion, co_champion_points: rules.co_champion, no_show_penalty: rules.no_show, late_cancel_penalty: rules.late_cancel, late_penalty: rules.late, left_early_penalty: rules.left_early });
  const openNew = () => { setForm(blank()); setImageFile(null); setImagePreview(null); setRsvps(null); setModal('new'); };
  const openEdit = r => {
    const d = r.date ? new Date(r.date) : null;
    setForm({
      ...r,
      date: d ? d.toISOString().slice(0, 10) : '',
      time: d ? d.toISOString().slice(11, 16) : '',
      tags: Array.isArray(r.tags) ? r.tags.join(', ') : '',
    });
    setImageFile(null); setImagePreview(r.image_url || null); setRsvps(null); setModal(r);
    supabase.from('event_rsvps_with_resident').select('*').eq('event_id', r.id)
      .then(({ data, error }) => setRsvps(error ? [] : (data || [])));
  };
  const close = () => { setModal(null); setForm({}); setRsvps(null); };

  const onFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!form.title?.trim()) return showToast('Введите название', 'err');
    setSaving(true);
    try {
      let image_url = form.image_url || null;
      if (imageFile) image_url = await uploadImage(imageFile, 'events');
      const dateTime = form.date ? `${form.date}T${form.time || '00:00'}:00` : null;
      const tags = (form.tags || '').split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        title: form.title, description: form.description || null, date: dateTime, image_url,
        location: form.location || null,
        speaker_name: form.speaker_name || null, speaker_role: form.speaker_role || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        tags,
        is_published: form.is_published !== false,
        category: form.category || 'business',
        points: parseInt(form.points) || 0,
        champion_points: parseInt(form.champion_points) || 0,
        co_champion_points: parseInt(form.co_champion_points) || 0,
        no_show_penalty: parseInt(form.no_show_penalty) || 0,
        late_cancel_penalty: parseInt(form.late_cancel_penalty) || 0,
        late_penalty: parseInt(form.late_penalty) || 0,
        left_early_penalty: parseInt(form.left_early_penalty) || 0,
        group_id: form.group_id || null,
      };
      if (!hasGroupCol) delete payload.group_id;
      // До применения миграции баллов этих колонок нет — сохраняем без них.
      if (!('category' in (rows[0] || { category: 1 }))) {
        delete payload.category; delete payload.points; delete payload.champion_points;
        delete payload.no_show_penalty; delete payload.late_penalty; delete payload.left_early_penalty;
        delete payload.co_champion_points; delete payload.late_cancel_penalty;
      }
      const { error } = modal === 'new'
        ? await supabase.from('events').insert(payload)
        : await supabase.from('events').update(payload).eq('id', form.id);
      if (error) throw error;
      showToast(modal === 'new' ? 'Мероприятие добавлено' : 'Сохранено');
      close(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async id => {
    if (!confirm('Удалить?')) return;
    await supabase.from('events').delete().eq('id', id);
    showToast('Удалено'); load();
  };

  const togglePub = async (id, val) => {
    await supabase.from('events').update({ is_published: val }).eq('id', id);
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: val } : x));
  };

  const canSendReminder = event =>
    event.is_published &&
    event.date &&
    new Date(event.date).getTime() > Date.now();

  const openReminder = async event => {
    if (!canSendReminder(event)) return;
    setReminderEvent(event);
    setRecipientMode('all');
    setSelectedResidentIds([]);
    const { data } = await supabase
      .from('residents')
      .select('id,name,company')
      .eq('is_published', true)
      .order('name');
    setReminderResidents(data || []);
  };

  const sendReminder = async () => {
    const event = reminderEvent;
    if (!event || !canSendReminder(event)) return;
    if (recipientMode === 'selected' && selectedResidentIds.length === 0) {
      return showToast('Выберите хотя бы одного резидента', 'err');
    }
    setSendingReminderId(event.id);
    try {
      const response = await fetch('/api/event-reminder', {
        method: 'POST',
        headers: await adminApiHeaders(),
        body: JSON.stringify({
          title: event.title,
          date: event.date,
          eventId: event.id,
          recipientMode,
          residentIds: recipientMode === 'selected' ? selectedResidentIds : [],
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      showToast(`Напоминание отправлено: ${result.sent || 0}`);
      setReminderEvent(null);
    } catch (e) {
      showToast('Не удалось отправить напоминание', 'err');
    } finally {
      setSendingReminderId(null);
    }
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Мероприятия</div>
          <div className="section-sub">{rows.length} событий</div>
        </div>
        <button className="btn btn-gold" onClick={openNew}><Ico i={Plus} /> Добавить</button>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th style={{ width: 88 }}>Фото</th><th>Название</th><th>Дата</th><th>Баллы</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>
                  {r.image_url
                    ? <img className="thumb" src={r.image_url} alt="" />
                    : <div className="thumb-ph"><Ico i={CalendarDays} /></div>
                  }
                </td>
                <td style={{ maxWidth: 300 }}>
                  <div className="cell-title truncate" style={{ maxWidth: 280 }}>{r.title}</div>
                  {r.group_id && <div className="badges"><span className="badge"><Ico i={Users} size={12} /> {groups.find(g => g.id === r.group_id)?.name || 'Группа'}</span></div>}
                </td>
                <td className="td-date">{r.date ? new Date(r.date).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td className="td-num" title={r.points != null ? categoryLabel(r.category) : undefined}>{r.points != null ? r.points : '—'}</td>
                <td><div className="pub-cell"><Toggle checked={r.is_published} onChange={v => togglePub(r.id, v)} /><PubState on={r.is_published} /></div></td>
                <td>
                  <div className="td-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={!canSendReminder(r) || sendingReminderId === r.id}
                      title={canSendReminder(r) ? 'Отправить push всем резидентам' : 'Доступно для опубликованных предстоящих событий'}
                      onClick={() => openReminder(r)}
                    >
                      {sendingReminderId === r.id ? 'Отправка…' : <><Ico i={Bell} /> Напомнить</>}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Редактировать</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="tbl-empty">Мероприятия не добавлены</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новое мероприятие' : 'Редактировать'} onClose={close} onSave={save} saving={saving}>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
          <div className="upload-area" onClick={() => fileRef.current.click()}>
            {imagePreview
              ? <img className="cover" src={imagePreview} alt="" />
              : <Ico i={ImagePlus} />
            }
            <p>{imageFile ? imageFile.name : 'Нажмите, чтобы выбрать обложку'}</p>
          </div>
          <div className="form-grid">
            <div className="field full"><label>Название *</label><input type="text" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <Field label="Дата"><input type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Время"><input type="time" value={form.time || ''} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></Field>
            <div className="field full"><label>Место проведения</label><input type="text" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Ritz-Carlton, Алматы" /></div>
            <Field label="Организатор"><input type="text" value={form.speaker_name || ''} onChange={e => setForm(f => ({ ...f, speaker_name: e.target.value }))} placeholder="Ларион Лян" /></Field>
            <Field label="Роль организатора"><input type="text" value={form.speaker_role || ''} onChange={e => setForm(f => ({ ...f, speaker_role: e.target.value }))} placeholder="Президент клуба" /></Field>
            <Field label="Вместимость (мест)"><input type="number" min="0" value={form.capacity || ''} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="50" /></Field>
            <Field label="Опубликован"><Toggle checked={form.is_published !== false} onChange={v => setForm(f => ({ ...f, is_published: v }))} /></Field>
            <div className="field full"><label>Аудитория</label>
              {hasGroupCol ? (
                <>
                  <select value={form.group_id || ''} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}>
                    <option value="">Для всех резидентов</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <div className="hint">Событие форум-группы видят только её участники</div>
                </>
              ) : (
                <div className="hint err">Выбор группы появится после миграции 2026-11-09_modernization_stage1.sql</div>
              )}
            </div>
            <div className="field full"><label>Категория (для рейтинга)</label>
              <select value={form.category || 'business'} onChange={e => setForm(f => ({ ...f, category: e.target.value, points: defaultPointsFor(e.target.value, rules) }))}>
                {EVENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label} — {rules[c.value]} баллов</option>)}
              </select>
            </div>
            <Field label="Баллы за посещение"><input type="number" min="0" value={form.points ?? ''} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} /></Field>
            <Field label="Баллы за чемпионство"><input type="number" min="0" value={form.champion_points ?? ''} onChange={e => setForm(f => ({ ...f, champion_points: e.target.value }))} /></Field>
            <Field label="Баллы за со-чемпионство"><input type="number" min="0" value={form.co_champion_points ?? ''} placeholder={String(rules.co_champion)} onChange={e => setForm(f => ({ ...f, co_champion_points: e.target.value }))} /></Field>
            {PENALTIES.map(p => (
              <Field key={p.key} label={`Антибаллы: ${p.label.toLowerCase()}`}>
                <input type="number" min="0" value={form[p.key] ?? ''} placeholder={String(rules[p.rule])}
                  onChange={e => setForm(f => ({ ...f, [p.key]: e.target.value }))} />
              </Field>
            ))}
            <div className="field full"><label>Участники (резиденты)</label><input type="text" value={form.tags || ''} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Через запятую: Ларион Лян, Тимур Нуртаев" /></div>
            <div className="field full"><label>Описание</label><textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} /></div>
          </div>

          {modal !== 'new' && (
            <div className="divider">
              <span className="sub-head">Посещение и баллы</span>
              <AttendancePanel event={modal} />
              {rsvps && rsvps.length > 0 && (
                <div className="hint" style={{ marginTop: 8 }}>
                  Записались в приложении: {rsvps.filter(r => r.status === 'going' || r.status === 'with_family').length} идут · {rsvps.filter(r => r.status === 'maybe').length} возможно · {rsvps.filter(r => r.status === 'not_going').length} не идут
                </div>
              )}
            </div>
          )}

          {modal !== 'new' && (
            <div className="divider">
              <span className="sub-head">Архив мероприятия</span>
              <EventArchiveEditor event={modal} />
            </div>
          )}
        </Modal>
      )}

      {reminderEvent && (
        <Modal
          title={`Напомнить: ${reminderEvent.title}`}
          onClose={() => setReminderEvent(null)}
          onSave={sendReminder}
          saving={sendingReminderId === reminderEvent.id}
          saveLabel="Отправить push"
        >
          <div style={{ display: 'grid', gap: 4 }}>
            {[
              ['going', 'Тем, кто идёт на мероприятие'],
              ['not_going', 'Тем, кто не идёт'],
              ['selected', 'Выборочно'],
              ['all', 'Всем резидентам'],
            ].map(([value, label]) => (
              <label key={value} className="picker-row">
                <input type="radio" name="recipientMode" value={value} checked={recipientMode === value} onChange={() => setRecipientMode(value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {recipientMode === 'selected' && (
            <div className="picker" style={{ maxHeight: 260 }}>
              {reminderResidents.map(resident => (
                <label key={resident.id} className="picker-row">
                  <input
                    type="checkbox"
                    checked={selectedResidentIds.includes(resident.id)}
                    onChange={e => setSelectedResidentIds(ids => e.target.checked ? [...ids, resident.id] : ids.filter(id => id !== resident.id))}
                  />
                  <span>{resident.name}{resident.company ? <span style={{ color: 'var(--muted)' }}> · {resident.company}</span> : ''}</span>
                </label>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
};

// ─── NEWS TAB ─────────────────────────────────────────────────────────────────

const NewsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('news').select('*').order('published_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ title: '', body: '', category: '', is_pinned: false, is_published: true });
  const openNew = () => { setForm(blank()); setImageFile(null); setImagePreview(null); setModal('new'); };
  const openEdit = r => { setForm({ ...r }); setImageFile(null); setImagePreview(r.image_url || null); setModal(r); };
  const close = () => { setModal(null); setForm({}); };

  const onFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!form.title?.trim()) return showToast('Введите название', 'err');
    setSaving(true);
    try {
      let image_url = form.image_url || null;
      if (imageFile) image_url = await uploadImage(imageFile, 'news');
      const payload = {
        title: form.title, excerpt: form.excerpt || null, body: form.body || null,
        category: form.category || null, image_url,
        is_pinned: !!form.is_pinned, is_published: form.is_published !== false,
      };
      const isNew = modal === 'new';
      const { error } = isNew
        ? await supabase.from('news').insert(payload)
        : await supabase.from('news').update(payload).eq('id', form.id);
      if (error) throw error;
      if (isNew && payload.is_published) {
        const pushResponse = await fetch('/api/news-push', {
          method: 'POST',
          headers: await adminApiHeaders(),
          body: JSON.stringify({ title: payload.title }),
        });
        if (!pushResponse.ok) {
          showToast('Новость добавлена, но push не отправлен', 'err');
        } else {
          showToast('Новость добавлена и уведомление отправлено');
        }
      } else {
        showToast(isNew ? 'Новость добавлена' : 'Сохранено');
      }
      close(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async id => {
    if (!confirm('Удалить?')) return;
    const { data, error } = await supabase
      .from('news')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    if (!data?.length) return showToast('Новость не удалена: нет прав', 'err');
    showToast('Удалено'); load();
  };

  const togglePub = async (id, val) => {
    const { error } = await supabase
      .from('news')
      .update({ is_published: val })
      .eq('id', id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: val } : x));
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Новости</div>
          <div className="section-sub">{rows.length} новостей</div>
        </div>
        <button className="btn btn-gold" onClick={openNew}><Ico i={Plus} /> Добавить</button>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th style={{ width: 88 }}>Фото</th><th>Название</th><th>Категория</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>
                  {r.image_url
                    ? <img className="thumb" src={r.image_url} alt="" />
                    : <div className="thumb-ph"><Ico i={Newspaper} /></div>
                  }
                </td>
                <td style={{ maxWidth: 320 }}>
                  <div className="cell-title" style={{ maxWidth: 300, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.is_pinned && <span title="Закреплена" style={{ color: 'var(--muted)', display: 'inline-flex', flexShrink: 0 }}><Ico i={Pin} size={14} /></span>}
                    <span className="truncate">{r.title}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{r.category || '—'}</td>
                <td><div className="pub-cell"><Toggle checked={r.is_published} onChange={v => togglePub(r.id, v)} /><PubState on={r.is_published} /></div></td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Редактировать</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="tbl-empty">Новости не добавлены</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новая новость' : 'Редактировать'} onClose={close} onSave={save} saving={saving}>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
          <div className="upload-area" onClick={() => fileRef.current.click()}>
            {imagePreview
              ? <img className="cover" src={imagePreview} alt="" />
              : <Ico i={ImagePlus} />
            }
            <p>{imageFile ? imageFile.name : 'Нажмите, чтобы выбрать обложку'}</p>
          </div>
          <div className="form-grid">
            <div className="field full"><label>Название *</label><input type="text" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <Field label="Категория"><input type="text" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Клуб" /></Field>
            <Field label="Закреплена"><Toggle checked={!!form.is_pinned} onChange={v => setForm(f => ({ ...f, is_pinned: v }))} /></Field>
            <Field label="Опубликована"><Toggle checked={form.is_published !== false} onChange={v => setForm(f => ({ ...f, is_published: v }))} /></Field>
            <div className="field full"><label>Текст новости</label><textarea value={form.body || ''} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={6} /></div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── PARTNERS TAB ─────────────────────────────────────────────────────────────

const PARTNER_NEW_COLS = ['valid_until', 'how_to_get'];

const PartnersTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cols, setCols] = useState(new Set()); // valid_until / how_to_get (modernization_stage1)
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, present] = await Promise.all([
      supabase.from('partners').select('*').order('created_at', { ascending: false }),
      probeColumns(supabase, 'partners', PARTNER_NEW_COLS),
    ]);
    setRows(data || []);
    setCols(present);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ name: '', description: '', category: 'restaurant', discount: '', discount_percent: '', discount_conditions: '', address: '', website: '', phone: '', is_published: true, is_exclusive: false });
  const openNew = () => { setForm(blank()); setImageFile(null); setImagePreview(null); setModal('new'); };
  const openEdit = r => { setForm({ ...r }); setImageFile(null); setImagePreview(r.logo_url || null); setModal(r); };
  const close = () => { setModal(null); setForm({}); };

  const onFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setImageFile(f); setImagePreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!form.name?.trim()) return showToast('Введите название', 'err');
    setSaving(true);
    try {
      let logo_url = form.logo_url || null;
      if (imageFile) logo_url = await uploadImage(imageFile, 'partners');
      const p = { name: form.name, description: form.description || null, category: form.category, discount: form.discount || null, discount_percent: form.discount_percent || null, discount_conditions: form.discount_conditions || null, address: form.address || null, website: form.website || null, phone: form.phone || null, logo_url, is_published: form.is_published !== false, is_exclusive: !!form.is_exclusive, valid_until: form.valid_until || null, how_to_get: form.how_to_get?.trim() || null };
      const payload = pickCols(p, PARTNER_NEW_COLS, cols);
      const { error } = modal === 'new'
        ? await supabase.from('partners').insert(payload)
        : await supabase.from('partners').update(payload).eq('id', form.id);
      if (error) throw error;
      showToast(modal === 'new' ? 'Партнёр добавлен' : 'Сохранено');
      close(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async id => {
    if (!confirm('Удалить партнёра?')) return;
    await supabase.from('partners').delete().eq('id', id);
    showToast('Удалено'); load();
  };

  const toggleField = async (id, field, val) => {
    await supabase.from('partners').update({ [field]: val }).eq('id', id);
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: val } : x));
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div><div className="section-title">Партнёры</div><div className="section-sub">{rows.length} партнёров</div></div>
        <button className="btn btn-gold" onClick={openNew}><Ico i={Plus} /> Добавить</button>
      </div>

      <div className="grid-2">
        {rows.map(r => (
          <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {r.logo_url
                ? <img src={r.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: 'var(--s2)' }} />
                : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', flexShrink: 0 }}><Ico i={Building2} /></div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cell-title truncate">{r.name}</div>
                <div className="hint">{PARTNER_CATS.find(c => c.value === r.category)?.label}{r.is_exclusive ? ' · эксклюзив' : ''}</div>
                {r.discount && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{r.discount}</div>}
                {r.valid_until && (
                  <div className="mono" style={{ marginTop: 4, color: new Date(r.valid_until + 'T23:59:59') < new Date() ? 'var(--danger)' : 'var(--muted)' }}>
                    {new Date(r.valid_until + 'T23:59:59') < new Date() ? 'Истекло ' : 'До '}{new Date(r.valid_until).toLocaleDateString('ru')}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <Toggle checked={r.is_published} onChange={v => toggleField(r.id, 'is_published', v)} />
              <PubState on={r.is_published} onLabel="Опубликован" offLabel="Скрыт" />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button className="btn-icon" title="Изменить" aria-label="Изменить" onClick={() => openEdit(r)}><Ico i={Pencil} /></button>
                <button className="btn-icon danger" title="Удалить" aria-label="Удалить" onClick={() => remove(r.id)}><Ico i={Trash2} /></button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <Empty icon={Handshake} text="Партнёры не добавлены" />}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Добавить партнёра' : 'Редактировать партнёра'} onClose={close} onSave={save} saving={saving}>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
          <div className="upload-area" onClick={() => fileRef.current.click()}>
            {imagePreview ? <img src={imagePreview} alt="" style={{ width: 64, height: 64 }} /> : <Ico i={Building2} />}
            <p>{imageFile ? imageFile.name : 'Логотип партнёра'}</p>
          </div>
          <div className="form-grid">
            <div className="field full"><label>Название *</label><input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="field full"><label>Описание</label><textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <Field label="Категория"><select value={form.category || 'restaurant'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{PARTNER_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
            <Field label="Скидка"><input type="text" value={form.discount || ''} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder="30% на всё" /></Field>
            <Field label="Скидка, % (бейдж в приложении)"><input type="text" value={form.discount_percent || ''} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} placeholder="15%" /></Field>
            <div className="field full"><label>Условия</label><textarea value={form.discount_conditions || ''} onChange={e => setForm(f => ({ ...f, discount_conditions: e.target.value }))} rows={2} /></div>
            <Field label="Адрес"><input type="text" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></Field>
            <Field label="Сайт"><input type="url" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></Field>
            <Field label="Телефон"><input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Field>
            {cols.has('valid_until') && (
              <Field label="Действует до"><input type="date" value={form.valid_until || ''} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></Field>
            )}
            {cols.has('how_to_get') && (
              <div className="field full"><label>Как получить привилегию</label><textarea value={form.how_to_get || ''} onChange={e => setForm(f => ({ ...f, how_to_get: e.target.value }))} rows={3} placeholder="Покажите карту резидента в приложении на кассе" /></div>
            )}
            {cols.size < PARTNER_NEW_COLS.length && (
              <div className="field full hint err">Поля «Действует до» и «Как получить привилегию» появятся после миграции 2026-11-09_modernization_stage1.sql</div>
            )}
            <div className="check-row">
              <label className="check-label"><Toggle checked={form.is_published !== false} onChange={v => setForm(f => ({ ...f, is_published: v }))} /> Опубликован</label>
              <label className="check-label"><Toggle checked={!!form.is_exclusive} onChange={v => setForm(f => ({ ...f, is_exclusive: v }))} /> Эксклюзив</label>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── POLLS TAB ────────────────────────────────────────────────────────────────

// Тестовые опросы — приглушены и с полосой слева (класс .tr-test), чтобы не путать с боевыми.

const PollsTab = () => {
  const [surveys, setSurveys] = useState([]);   // общие опросы (анкеты)
  const [rows, setRows] = useState([]);         // одиночные опросы (survey_id = null)
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);     // модалка вопроса / одиночного опроса
  const [form, setForm] = useState({});
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  // ── Общий опрос ──
  const [surveyModal, setSurveyModal] = useState(null); // null | 'new' | row
  const [surveyForm, setSurveyForm] = useState({});
  const [surveyQuestions, setSurveyQuestions] = useState([]); // сохранённые вопросы
  const [draftQuestions, setDraftQuestions] = useState([]);   // черновик (новый опросник)
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [surveyTargets, setSurveyTargets] = useState([]);     // выбранные резиденты
  const [audienceData, setAudienceData] = useState({ residents: [], events: [], groups: [] });
  const [targetQuery, setTargetQuery] = useState('');
  const [analyticsSurvey, setAnalyticsSurvey] = useState(null);
  // is_test (миграция modernization_stage1): тестовые опросы не показываются в приложении.
  const [testCols, setTestCols] = useState({ polls: false, surveys: false });

  const isDraftSurvey = surveyModal === 'new';

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p, pc, sc] = await Promise.all([
      supabase.from('surveys').select('*, polls(count)').order('created_at', { ascending: false }),
      supabase.from('polls').select('*, poll_answers(count)').is('survey_id', null).order('created_at', { ascending: false }),
      probeColumns(supabase, 'polls', ['is_test']),
      probeColumns(supabase, 'surveys', ['is_test']),
    ]);
    setSurveys(s.data || []);
    setRows(p.data || []);
    setTestCols({ polls: pc.has('is_test'), surveys: sc.has('is_test') });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadSurveyQuestions = async (surveyId) => {
    const { data } = await supabase.from('polls')
      .select('*, poll_answers(count)').eq('survey_id', surveyId)
      .order('sort_order', { ascending: true });
    setSurveyQuestions(data || []);
  };

  // ── Вопрос / одиночный опрос ──
  const blank = (extra = {}) => ({
    question: '', description: '', type: 'single', is_active: true, ends_at: '',
    survey_id: null, sort_order: 0, is_required: true, scale_max: 5, ...extra,
  });
  // Добавление вопроса: в черновик (новый опросник) или сразу в БД (сохранённый).
  const openNewQuestion = () => {
    if (isDraftSurvey) {
      setForm(blank({ __draft: true, __idx: null, sort_order: draftQuestions.length + 1 }));
    } else {
      setForm(blank({ survey_id: surveyForm.id, sort_order: surveyQuestions.length + 1 }));
    }
    setOptions(['', '']); setModal('new');
  };

  const openEdit = r => {
    setForm({ ...r, ends_at: toLocalInput(r.ends_at) });
    const opts = Array.isArray(r.options) ? r.options : [];
    setOptions(opts.length ? opts : ['', '']);
    setModal(r);
  };
  const openEditDraft = (q, i) => {
    setForm({ ...q, __draft: true, __idx: i });
    setOptions(q.options?.length ? q.options : ['', '']);
    setModal(q);
  };
  const close = () => { setModal(null); setForm({}); setOptions(['', '']); };

  const needsOptions = ['single', 'multiple'].includes(form.type);
  const isSurveyQuestion = !!form.survey_id || !!form.__draft;

  const save = async () => {
    if (!form.question?.trim()) return showToast('Введите вопрос', 'err');
    if (needsOptions && options.filter(o => o.trim()).length < 2) return showToast('Минимум 2 варианта', 'err');

    // Черновик: ничего не пишем в БД, копим в памяти до сохранения опросника.
    if (form.__draft) {
      const q = {
        question: form.question,
        description: form.description || null,
        type: form.type,
        options: needsOptions ? options.filter(o => o.trim()) : [],
        is_active: !!form.is_active,
        sort_order: form.sort_order || 0,
        is_required: form.is_required !== false,
        scale_max: form.type === 'rating' ? (parseInt(form.scale_max) || 5) : 5,
      };
      setDraftQuestions(list => form.__idx === null || form.__idx === undefined
        ? [...list, q]
        : list.map((x, i) => i === form.__idx ? q : x));
      close();
      return;
    }

    setSaving(true);
    try {
      const payload = {
        question: form.question,
        description: form.description || null,
        type: form.type,
        options: needsOptions ? options.filter(o => o.trim()) : [],
        is_active: !!form.is_active,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        survey_id: form.survey_id || null,
        sort_order: form.sort_order || 0,
        is_required: form.is_required !== false,
        scale_max: form.type === 'rating' ? (parseInt(form.scale_max) || 5) : 5,
      };
      // «Тестовый» — только у одиночных опросов; вопросы анкеты наследуют его от анкеты.
      if (testCols.polls && !form.survey_id) payload.is_test = !!form.is_test;
      const { error } = modal === 'new'
        ? await supabase.from('polls').insert(payload)
        : await supabase.from('polls').update(payload).eq('id', form.id);
      if (error) throw error;
      showToast(modal === 'new' ? 'Вопрос добавлен' : 'Сохранено');
      const sid = form.survey_id;
      close();
      if (sid) await loadSurveyQuestions(sid);
      load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async (id, surveyId = null) => {
    if (!confirm('Удалить и все ответы на него?')) return;
    await supabase.from('polls').delete().eq('id', id);
    showToast('Удалено');
    if (surveyId) await loadSurveyQuestions(surveyId);
    load();
  };

  const toggleActive = async (id, val) => {
    await supabase.from('polls').update({ is_active: val }).eq('id', id);
    setRows(r => r.map(x => x.id === id ? { ...x, is_active: val } : x));
  };

  // ── Общий опрос: CRUD ──
  const loadAudienceData = async () => {
    const [r, e, g] = await Promise.all([
      supabase.from('residents').select('id,name,company').eq('is_published', true).order('name'),
      supabase.from('events').select('id,title,date').order('date', { ascending: false }).limit(60),
      supabase.from('resident_groups').select('id,name').order('name'),
    ]);
    setAudienceData({ residents: r.data || [], events: e.data || [], groups: g.data || [] });
  };

  const openSurveyNew = () => {
    setSurveyForm({
      title: '', description: '', is_active: true, ends_at: '', starts_at: '',
      kind: 'poll', audience: 'all', audience_event_id: '', audience_group_id: '',
      rsvp_event_id: '', is_mandatory: false, is_anonymous: false, is_test: false,
    });
    setSurveyQuestions([]); setDraftQuestions([]); setSurveyTargets([]); setTargetQuery('');
    setSurveyModal('new'); loadAudienceData();
  };
  const openSurveyEdit = async (r) => {
    setSurveyForm({
      ...r,
      ends_at: toLocalInput(r.ends_at), starts_at: toLocalInput(r.starts_at),
      kind: r.kind || 'poll', audience: r.audience || 'all',
      audience_event_id: r.audience_event_id || '', audience_group_id: r.audience_group_id || '',
      rsvp_event_id: r.rsvp_event_id || '',
    });
    setDraftQuestions([]); setSurveyTargets([]); setTargetQuery(''); setSurveyModal(r);
    loadAudienceData();
    supabase.from('survey_targets').select('resident_id').eq('survey_id', r.id)
      .then(({ data }) => setSurveyTargets((data || []).map(x => x.resident_id)));
    await loadSurveyQuestions(r.id);
  };
  const closeSurvey = () => {
    setSurveyModal(null); setSurveyForm({});
    setSurveyQuestions([]); setDraftQuestions([]); setSurveyTargets([]);
  };

  const saveTargets = async surveyId => {
    const { error: delErr } = await supabase.from('survey_targets').delete().eq('survey_id', surveyId);
    if (delErr) throw delErr;
    if (surveyForm.audience === 'selected' && surveyTargets.length) {
      const { error } = await supabase.from('survey_targets')
        .insert(surveyTargets.map(resident_id => ({ survey_id: surveyId, resident_id })));
      if (error) throw error;
    }
  };

  const saveSurvey = async () => {
    const f = surveyForm;
    if (!f.title?.trim()) return showToast('Введите название опросника', 'err');
    if (isDraftSurvey && draftQuestions.length === 0 && f.kind !== 'registration') return showToast('Добавьте хотя бы один вопрос', 'err');
    if (f.audience === 'selected' && surveyTargets.length === 0) return showToast('Выберите получателей', 'err');
    if (f.audience === 'event' && !f.audience_event_id) return showToast('Выберите мероприятие', 'err');
    if (f.audience === 'group' && !f.audience_group_id) return showToast('Выберите группу', 'err');
    if (f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)) return showToast('Дедлайн раньше даты начала', 'err');
    const isRegistration = f.kind === 'registration';
    if (isRegistration && !f.rsvp_event_id) return showToast('Выберите мероприятие для записи', 'err');
    setSavingSurvey(true);
    try {
      const payload = {
        title: f.title,
        description: f.description || null,
        is_active: !!f.is_active,
        ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
        starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
        kind: f.kind || 'poll',
        audience: f.audience || 'all',
        audience_event_id: f.audience === 'event' ? f.audience_event_id : null,
        audience_group_id: f.audience === 'group' ? f.audience_group_id : null,
        is_mandatory: !!f.is_mandatory,
        // Регистрация пишет запись на мероприятие от имени резидента — анонимной быть не может.
        is_anonymous: isRegistration ? false : !!f.is_anonymous,
        rsvp_event_id: isRegistration ? f.rsvp_event_id : null,
      };
      if (testCols.surveys) payload.is_test = !!f.is_test;
      if (isDraftSurvey) {
        // 1) создаём опросник, 2) вопросы и получателей, 3) «касаемся»
        // опросника — это и отправляет ОДНО уведомление его аудитории.
        const { data: created, error } = await supabase.from('surveys').insert(payload).select().single();
        if (error) throw error;
        const qs = draftQuestions.map((q, i) => ({ ...q, survey_id: created.id, sort_order: q.sort_order || i + 1 }));
        if (isRegistration && !qs.some(q => q.rsvp_link)) qs.unshift({ ...RSVP_QUESTION, survey_id: created.id });
        const { error: qErr } = await supabase.from('polls').insert(qs);
        if (qErr) throw qErr;
        await saveTargets(created.id);
        await supabase.from('surveys').update({ title: created.title }).eq('id', created.id);
        showToast(payload.starts_at && new Date(payload.starts_at) > new Date() ? 'Опросник создан — уведомление уйдёт в дату старта' : 'Опросник создан');
      } else {
        await saveTargets(f.id);
        if (isRegistration && !surveyQuestions.some(q => q.rsvp_link)) {
          const { error: qErr } = await supabase.from('polls').insert({ ...RSVP_QUESTION, survey_id: f.id });
          if (qErr) throw qErr;
        }
        const { error } = await supabase.from('surveys').update(payload).eq('id', f.id);
        if (error) throw error;
        showToast('Сохранено');
      }
      closeSurvey(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSavingSurvey(false);
  };

  const removeSurvey = async (id) => {
    if (!confirm('Удалить опросник вместе со всеми вопросами и ответами?')) return;
    await supabase.from('surveys').delete().eq('id', id);
    showToast('Удалено'); load();
  };

  const toggleSurveyActive = async (id, val) => {
    await supabase.from('surveys').update({ is_active: val }).eq('id', id);
    setSurveys(s => s.map(x => x.id === id ? { ...x, is_active: val } : x));
  };

  // ── Просмотр ответов ──
  const [answersPoll, setAnswersPoll] = useState(null);
  const [answers, setAnswers] = useState(null);

  const openAnswers = async (r) => {
    setAnswersPoll(r); setAnswers(null);
    let { data, error } = await supabase.from('poll_answers_with_resident')
      .select('*').eq('poll_id', r.id).order('created_at', { ascending: false });
    if (error) {
      const res = await supabase.from('poll_answers')
        .select('id, answer, created_at').eq('poll_id', r.id).order('created_at', { ascending: false });
      data = (res.data || []).map(a => ({ ...a, name: 'Резидент' }));
    }
    setAnswers(data || []);
  };

  const renderAnswer = answerText;

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Опросы</div>
          <div className="section-sub">{surveys.length} анкет{rows.length ? ` · ${rows.length} одиночных (старый формат)` : ''}</div>
        </div>
        <button className="btn btn-gold" onClick={openSurveyNew}><Ico i={Plus} /> Опрос или анкета</button>
      </div>

      <div className="tbl-wrap" style={{ marginBottom: 24 }}>
        <div className="tbl-caption">Опросы и анкеты</div>
        <table>
          <thead><tr><th>Название</th><th>Аудитория</th><th>Вопросов</th><th>Период</th><th>Активен</th><th></th></tr></thead>
          <tbody>
            {surveys.map(s => (
              <tr key={s.id} className={s.is_test ? 'tr-test' : undefined}>
                <td style={{ maxWidth: 340 }}>
                  <div className="cell-title">{s.title}</div>
                  <div className="badges">
                    {s.is_test && <span className="badge badge-red" title="Не показывается в приложении">Тестовый</span>}
                    <span className="badge">{SURVEY_KINDS.find(k => k.value === (s.kind || 'poll'))?.label}</span>
                    {s.is_mandatory && <span className="badge">Обязательный</span>}
                    {s.is_anonymous && <span className="badge">Анонимный</span>}
                  </div>
                </td>
                <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{AUDIENCES.find(a => a.value === (s.audience || 'all'))?.label}</td>
                <td className="td-num">{s.polls?.[0]?.count ?? 0}</td>
                <td className="td-date">
                  {s.starts_at ? new Date(s.starts_at).toLocaleDateString('ru') : 'сразу'} → {s.ends_at ? new Date(s.ends_at).toLocaleDateString('ru') : '∞'}
                </td>
                <td><Toggle checked={s.is_active} onChange={v => toggleSurveyActive(s.id, v)} /></td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setAnalyticsSurvey(s)}><Ico i={ChartColumn} /> Аналитика</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openSurveyEdit(s)}>Изменить</button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeSurvey(s.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {surveys.length === 0 && <div className="tbl-empty">Общие опросы не созданы</div>}
      </div>

      <div className="tbl-wrap">
        <div className="tbl-caption">Одиночные опросы <span className="hint">старый формат</span></div>
        <table>
          <thead><tr><th>Вопрос</th><th>Тип</th><th>Ответов</th><th>Срок</th><th>Активен</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={r.is_test ? 'tr-test' : undefined}>
                <td style={{ maxWidth: 320 }}>
                  <div className="cell-title truncate" style={{ maxWidth: 300 }}>{r.question}</div>
                  {r.is_test && <div className="badges"><span className="badge badge-red" title="Не показывается в приложении">Тестовый</span></div>}
                </td>
                <td><span className="badge">{POLL_TYPES.find(t => t.value === r.type)?.label}</span></td>
                <td>
                  <button type="button" className="stat-pill" title="Показать ответы" onClick={() => openAnswers(r)}>
                    <Ico i={MessageSquare} size={14} /> <b>{r.poll_answers?.[0]?.count ?? 0}</b>
                  </button>
                </td>
                <td className="td-date">{r.ends_at ? new Date(r.ends_at).toLocaleDateString('ru') : '∞'}</td>
                <td><Toggle checked={r.is_active} onChange={v => toggleActive(r.id, v)} /></td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Изменить</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="tbl-empty">Одиночные опросы не созданы</div>}
      </div>

      {surveyModal !== null && (
        <Modal
          title={isDraftSurvey ? 'Новый общий опрос' : 'Общий опрос'}
          onClose={closeSurvey} onSave={saveSurvey} saving={savingSurvey}>
          <div className="form-grid">
            <div className="field full"><label>Название опросника *</label><input type="text" value={surveyForm.title || ''} onChange={e => setSurveyForm(f => ({ ...f, title: e.target.value }))} placeholder="Опрос удовлетворённости, июль 2026" /></div>
            <div className="field full"><label>Описание</label><textarea value={surveyForm.description || ''} onChange={e => setSurveyForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Короткое пояснение для резидентов" /></div>
            <Field label="Вид"><select value={surveyForm.kind || 'poll'} onChange={e => setSurveyForm(f => ({ ...f, kind: e.target.value, is_anonymous: e.target.value === 'nps' ? true : e.target.value === 'registration' ? false : f.is_anonymous }))}>{SURVEY_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Field>
            {surveyForm.kind === 'registration' && (
              <div className="field full"><label>Мероприятие для записи *</label>
                <select value={surveyForm.rsvp_event_id || ''} onChange={e => setSurveyForm(f => ({ ...f, rsvp_event_id: e.target.value }))}>
                  <option value="">— выберите —</option>
                  {audienceData.events.map(ev => <option key={ev.id} value={ev.id}>{ev.date ? new Date(ev.date).toLocaleDateString('ru') + ' · ' : ''}{ev.title.slice(0, 80)}</option>)}
                </select>
                <div className="hint">В анкету добавится вопрос «Подтверждаете участие? — Иду / Не иду / Возможно». Ответ сразу записывает резидента на мероприятие.</div>
              </div>
            )}
            <Field label="Аудитория"><select value={surveyForm.audience || 'all'} onChange={e => setSurveyForm(f => ({ ...f, audience: e.target.value }))}>{AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></Field>
            {surveyForm.audience === 'event' && (
              <div className="field full"><label>Мероприятие</label>
                <select value={surveyForm.audience_event_id || ''} onChange={e => setSurveyForm(f => ({ ...f, audience_event_id: e.target.value }))}>
                  <option value="">— выберите —</option>
                  {audienceData.events.map(ev => <option key={ev.id} value={ev.id}>{ev.date ? new Date(ev.date).toLocaleDateString('ru') + ' · ' : ''}{ev.title.slice(0, 80)}</option>)}
                </select>
              </div>
            )}
            {surveyForm.audience === 'group' && (
              <div className="field full"><label>Группа / Форум</label>
                <select value={surveyForm.audience_group_id || ''} onChange={e => setSurveyForm(f => ({ ...f, audience_group_id: e.target.value }))}>
                  <option value="">— выберите —</option>
                  {audienceData.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                {audienceData.groups.length === 0 && <div className="hint">Групп нет — создайте их в разделе «Группы»</div>}
              </div>
            )}
            {surveyForm.audience === 'selected' && (
              <div className="field full"><label>Получатели ({surveyTargets.length})</label>
                <input type="text" placeholder="Поиск" value={targetQuery} onChange={e => setTargetQuery(e.target.value)} />
                <div className="picker" style={{ maxHeight: 200 }}>
                  {audienceData.residents
                    .filter(r => !targetQuery.trim() || `${r.name} ${r.company || ''}`.toLowerCase().includes(targetQuery.trim().toLowerCase()))
                    .map(r => (
                      <label key={r.id} className="picker-row">
                        <input type="checkbox" checked={surveyTargets.includes(r.id)}
                          onChange={e => setSurveyTargets(ids => e.target.checked ? [...ids, r.id] : ids.filter(x => x !== r.id))} />
                        <span>{r.name}{r.company ? ` · ${r.company}` : ''}</span>
                      </label>
                    ))}
                </div>
              </div>
            )}
            <Field label="Дата начала"><input type="datetime-local" value={surveyForm.starts_at || ''} onChange={e => setSurveyForm(f => ({ ...f, starts_at: e.target.value }))} /></Field>
            <Field label="Дедлайн"><input type="datetime-local" value={surveyForm.ends_at || ''} onChange={e => setSurveyForm(f => ({ ...f, ends_at: e.target.value }))} /></Field>
            <label className="check-label"><Toggle checked={!!surveyForm.is_mandatory} onChange={v => setSurveyForm(f => ({ ...f, is_mandatory: v }))} /> Обязательный</label>
            <label className="check-label" title="Ответы сохраняются без привязки к резиденту. Видно только, кто прошёл опрос."><Toggle checked={!!surveyForm.is_anonymous} onChange={v => setSurveyForm(f => ({ ...f, is_anonymous: v }))} /> Анонимный</label>
            <label className="check-label"><Toggle checked={!!surveyForm.is_active} onChange={v => setSurveyForm(f => ({ ...f, is_active: v }))} /> Активен</label>
            {testCols.surveys && (
              <label className="check-label">
                <input type="checkbox" checked={!!surveyForm.is_test} onChange={e => setSurveyForm(f => ({ ...f, is_test: e.target.checked }))} />
                Тестовый (не показывать в приложении)
              </label>
            )}
          </div>
          {!isDraftSurvey && surveyForm.notified_at && surveyForm.is_anonymous !== surveyModal.is_anonymous && (
            <div className="hint err">Анонимность меняется только для новых ответов — уже полученные ответы не изменятся</div>
          )}

          <div className="field" style={{ marginTop: 8 }}>
            <label>Вопросы ({isDraftSurvey ? draftQuestions.length : surveyQuestions.length})</label>
            <div className="list">
              {isDraftSurvey
                ? draftQuestions.map((q, i) => (
                    <div key={i} className="list-row">
                      <span className="idx">{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13 }}>{q.question}{q.is_required !== false && <span style={{ color: 'var(--muted)' }}> *</span>}</span>
                      <span className="badge">{POLL_TYPES.find(t => t.value === q.type)?.label}</span>
                      <button className="btn btn-outline btn-sm" onClick={() => openEditDraft(q, i)}>Изменить</button>
                      <button className="btn-icon danger" aria-label="Удалить вопрос" title="Удалить" onClick={() => setDraftQuestions(l => l.filter((_, j) => j !== i))}><Ico i={Trash2} /></button>
                    </div>
                  ))
                : surveyQuestions.map((q, i) => (
                    <div key={q.id} className="list-row">
                      <span className="idx">{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13 }}>{q.question}{q.is_required !== false && <span style={{ color: 'var(--muted)' }}> *</span>}</span>
                      <span className="badge">{POLL_TYPES.find(t => t.value === q.type)?.label}</span>
                      <button type="button" className="stat-pill" title="Ответы" onClick={() => openAnswers(q)}><Ico i={MessageSquare} size={14} /> <b>{q.poll_answers?.[0]?.count ?? 0}</b></button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(q)}>Изменить</button>
                      <button className="btn-icon danger" aria-label="Удалить вопрос" title="Удалить" onClick={() => remove(q.id, surveyForm.id)}><Ico i={Trash2} /></button>
                    </div>
                  ))}
              {(isDraftSurvey ? draftQuestions : surveyQuestions).length === 0 &&
                <div className="hint">Вопросов пока нет</div>}
            </div>
            <button className="add-option" onClick={openNewQuestion}><Ico i={Plus} size={14} /> Добавить вопрос</button>
            {isDraftSurvey && (
              <div className="hint">
                Вопросы сохранятся вместе с опросником — резиденты получат одно уведомление
              </div>
            )}
          </div>
        </Modal>
      )}

      {analyticsSurvey && <SurveyAnalytics survey={analyticsSurvey} onClose={() => setAnalyticsSurvey(null)} />}

      {answersPoll !== null && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setAnswersPoll(null)}>
          <div className="modal">
            <div className="modal-title">Ответы — {answersPoll.question}</div>
            {answers === null ? (
              <div className="hint">Загрузка…</div>
            ) : answers.length === 0 ? (
              <div className="hint">Ответов пока нет</div>
            ) : (
              <div className="list" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                {answers.map(a => (
                  <div key={a.id} className="list-row" style={{ alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{a.name}{a.company ? ` · ${a.company}` : ''}</span>
                    <span style={{ fontSize: 13, flex: 1 }}>{renderAnswer(answersPoll, a)}</span>
                    <span className="mono" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAnswersPoll(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {modal !== null && (
        <Modal
          title={isSurveyQuestion
            ? (modal === 'new' ? 'Новый вопрос анкеты' : 'Редактировать вопрос')
            : (modal === 'new' ? 'Новый опрос' : 'Редактировать опрос')}
          onClose={close} onSave={save} saving={saving}>
          <div className="form-grid">
            <div className="field full"><label>Вопрос *</label><input type="text" value={form.question || ''} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} /></div>
            <div className="field full"><label>Описание</label><textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <Field label="Тип ответа"><select value={form.type || 'single'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{POLL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
            {isSurveyQuestion
              ? <Field label="Порядок"><input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></Field>
              : <Field label="Активен до"><input type="datetime-local" value={form.ends_at || ''} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} /></Field>}
            {form.type === 'rating' && (
              <Field label="Шкала"><select value={form.scale_max || 5} onChange={e => setForm(f => ({ ...f, scale_max: parseInt(e.target.value) }))}>
                <option value={5}>1–5</option><option value={10}>1–10</option>
              </select></Field>
            )}
            {isSurveyQuestion && (
              <label className="check-label"><Toggle checked={form.is_required !== false} onChange={v => setForm(f => ({ ...f, is_required: v }))} /> Обязательный вопрос</label>
            )}
            <label className="check-label"><Toggle checked={!!form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} /> Активен</label>
            {testCols.polls && !isSurveyQuestion && (
              <label className="check-label">
                <input type="checkbox" checked={!!form.is_test} onChange={e => setForm(f => ({ ...f, is_test: e.target.checked }))} />
                Тестовый (не показывать в приложении)
              </label>
            )}
          </div>
          {needsOptions && (
            <div className="field">
              <label>Варианты ответа</label>
              {options.map((o, i) => (
                <div key={i} className="option-row">
                  <input type="text" value={o} onChange={e => setOptions(opts => opts.map((x, j) => j === i ? e.target.value : x))} placeholder={`Вариант ${i + 1}`} />
                  {options.length > 2 && <button type="button" className="btn-icon danger" aria-label="Удалить вариант" title="Удалить" onClick={() => setOptions(o => o.filter((_, j) => j !== i))}><Ico i={Trash2} /></button>}
                </div>
              ))}
              <button className="add-option" onClick={() => setOptions(o => [...o, ''])}><Ico i={Plus} size={14} /> Добавить вариант</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
};

// ─── PRESIDENT TAB ────────────────────────────────────────────────────────────

const PresidentTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    supabase.from('president').select('*').eq('id', 1).single()
      .then(({ data: d }) => { setData(d || {}); setImagePreview(d?.photo_url || null); setLoading(false); });
  }, []);

  const onFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setImageFile(f); setImagePreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true);
    try {
      let photo_url = data.photo_url || null;
      if (imageFile) photo_url = await uploadImage(imageFile, 'president');
      await supabase.from('president').upsert({ id: 1, name: data.name, bio: data.bio, photo_url });
      showToast('Сохранено');
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div><div className="section-title">Президент клуба</div><div className="section-sub">Информация на главной странице сайта</div></div>
        <button className="btn btn-gold" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner" /> Сохранение…</> : 'Сохранить'}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
        <div className="president-wrap">
          {imagePreview
            ? <img className="president-photo" src={imagePreview} alt="" onClick={() => fileRef.current.click()} />
            : <div className="president-photo-ph" onClick={() => fileRef.current.click()}><Ico i={Camera} /><span>Загрузить фото</span></div>
          }
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            <Field label="Имя"><input type="text" value={data.name || ''} onChange={e => setData(d => ({ ...d, name: e.target.value }))} placeholder="Тимур Нуртаев" /></Field>
            <Field label="Биография"><textarea value={data.bio || ''} onChange={e => setData(d => ({ ...d, bio: e.target.value }))} rows={5} placeholder="Расскажите о президенте клуба…" /></Field>
            {imageFile && <div className="hint">Выбрано: {imageFile.name}</div>}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── ACCESS REQUESTS TAB ───────────────────────────────────────────────────────

const AccessRequestsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('access_requests')
      .select('*, residents(name, company)')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (req) => {
    if (!confirm('Привязать этот номер к резиденту и одобрить вход?')) return;
    const { error: updErr } = await supabase.from('residents').update({ phone: req.phone }).eq('id', req.resident_id);
    if (updErr) return showToast('Ошибка: ' + updErr.message, 'err');
    const { error } = await supabase.from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', req.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Заявка одобрена, номер привязан');
    load();
  };

  const reject = async (id) => {
    if (!confirm('Отклонить заявку?')) return;
    const { error } = await supabase.from('access_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Заявка отклонена');
    load();
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Заявки на доступ</div>
          <div className="section-sub">{rows.length} заявок</div>
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr><th>Резидент</th><th>Номер телефона</th><th>Подана</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const resident = r.residents || {};
              const created = new Date(r.created_at).toLocaleString('ru');
              return (
                <tr key={r.id}>
                  <td>
                    <div className="cell-title">{resident.name || '—'}</div>
                    {resident.company && <div className="cell-sub">{resident.company}</div>}
                  </td>
                  <td className="td-num">{r.phone}</td>
                  <td className="td-date">{created}</td>
                  <td>
                    {r.status === 'pending' && <span className="verdict" style={{ color: 'var(--text)' }}>Ожидает</span>}
                    {r.status === 'approved' && <span className="verdict ok">Одобрена</span>}
                    {r.status === 'rejected' && <span className="verdict" style={{ color: 'var(--muted)' }}>Отклонена</span>}
                  </td>
                  <td>
                    {r.status === 'pending' && (
                      <div className="td-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => approve(r)}>Одобрить</button>
                        <button className="btn btn-outline btn-sm" onClick={() => reject(r.id)}>Отклонить</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5}><Empty icon={KeyRound} text="Заявок нет" /></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// Вход — Supabase Auth (email + пароль). Сессию хранит и обновляет supabase-js.
// Права проверяются на сервере: rpc('is_admin') смотрит в public.admin_users,
// и те же is_admin()-политики RLS ограничивают все таблицы админки.

const authErrorText = error => {
  const msg = String(error?.message || error || '');
  if (/invalid login credentials/i.test(msg)) return 'Неверный email или пароль';
  if (/email not confirmed/i.test(msg)) return 'Email не подтверждён';
  if (/rate limit|too many/i.test(msg)) return 'Слишком много попыток, попробуйте позже';
  if (/password should be at least/i.test(msg)) return 'Пароль слишком короткий';
  return msg || 'Ошибка входа';
};


const Login = ({ initialError = '', recovery = false, onRecovered }) => {
  const [mode, setMode] = useState(recovery ? 'recovery' : 'login'); // login | forgot | recovery
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState(initialError);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const go = m => { setMode(m); setError(''); setInfo(''); };

  const signIn = async e => {
    e.preventDefault(); setError(''); setInfo('');
    if (!email.trim() || !password) { setError('Введите email и пароль'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) setError(authErrorText(err));
    // Успех обрабатывает onAuthStateChange в Admin (проверка is_admin()).
  };

  const sendReset = async e => {
    e.preventDefault(); setError(''); setInfo('');
    if (!email.trim()) { setError('Введите email'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin`,
    });
    setLoading(false);
    if (err) setError(authErrorText(err));
    else setInfo('Если такой администратор есть, на почту придёт ссылка для смены пароля');
  };

  const setNewPassword = async e => {
    e.preventDefault(); setError(''); setInfo('');
    if (password.length < 8) { setError('Пароль — не короче 8 символов'); return; }
    if (password !== password2) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(authErrorText(err)); return; }
    setPassword(''); setPassword2('');
    onRecovered?.();
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="login-logo">26 Business Club</div>
          <div className="login-sub">Панель администратора</div>
        </div>

        {mode === 'login' && (
          <form onSubmit={signIn} className="login-form">
            <Field label="Email">
              <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" autoFocus />
            </Field>
            <Field label="Пароль">
              <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            </Field>
            <button className="btn btn-gold btn-wide" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Войти'}
            </button>
            <button type="button" className="btn-ghost" style={{ alignSelf: 'center' }} onClick={() => go('forgot')}>Забыли пароль?</button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={sendReset} className="login-form">
            <Field label="Email администратора">
              <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" autoFocus />
            </Field>
            <button className="btn btn-gold btn-wide" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Отправить ссылку'}
            </button>
            <button type="button" className="btn-ghost" style={{ alignSelf: 'center' }} onClick={() => go('login')}><Ico i={ArrowLeft} /> Ко входу</button>
          </form>
        )}

        {mode === 'recovery' && (
          <form onSubmit={setNewPassword} className="login-form">
            <Field label="Новый пароль">
              <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
            </Field>
            <Field label="Повторите пароль">
              <input type="password" autoComplete="new-password" value={password2} onChange={e => setPassword2(e.target.value)} />
            </Field>
            <button className="btn btn-gold btn-wide" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Сохранить пароль'}
            </button>
          </form>
        )}

        {error && <div className="login-msg err">{error}</div>}
        {info && <div className="login-msg ok">{info}</div>}
      </div>
    </div>
  );
};

// ─── MAIN ADMIN ───────────────────────────────────────────────────────────────

const Admin = () => {
  const [admin, setAdmin] = useState(null);        // { id, name, email } — только после is_admin() = true
  const [checking, setChecking] = useState(true);  // идёт проверка сессии/прав
  const [authError, setAuthError] = useState(authRedirect.error || '');
  const [recovery, setRecovery] = useState(authRedirect.type === 'recovery'); // пришли по ссылке «Забыли пароль?»
  const [tab, setTab] = useState('residents');
  const checkedUser = useRef(null);                // id пользователя, для которого права уже проверены
  const recoveryRef = useRef(authRedirect.type === 'recovery');

  const verify = useCallback(async session => {
    const user = session?.user;
    if (!user) { checkedUser.current = null; setAdmin(null); setChecking(false); return; }
    if (checkedUser.current === user.id) { setChecking(false); return; }
    setChecking(true);
    const { data: ok, error } = await supabase.rpc('is_admin');
    if (error || ok !== true) {
      checkedUser.current = null;
      setAdmin(null);
      setAuthError(error ? `Не удалось проверить права: ${error.message}` : 'Нет прав администратора');
      await supabase.auth.signOut({ scope: 'local' });
      setChecking(false);
      return;
    }
    // Своя строка admin_users доступна по политике admin_users_select_own (2026-11-10_admin_auth.sql).
    const { data: me } = await supabase.from('admin_users').select('name').eq('user_id', user.id).maybeSingle();
    checkedUser.current = user.id;
    setAuthError('');
    setAdmin({ id: user.id, name: me?.name || user.email, email: user.email });
    setChecking(false);
  }, []);

  useEffect(() => {
    // onAuthStateChange сразу присылает INITIAL_SESSION (сохранённая сессия supabase-js).
    // Запросы к Supabase внутри колбэка не ждём — откладываем через setTimeout (рекомендация supabase-js).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryRef.current = true;
        setRecovery(true);
        setChecking(false);
        return;
      }
      if (event === 'SIGNED_OUT') {
        checkedUser.current = null;
        recoveryRef.current = false;
        setRecovery(false);
        setAdmin(null);
        setChecking(false);
        return;
      }
      if (recoveryRef.current) return; // сначала новый пароль, потом проверка прав
      setTimeout(() => { verify(session); }, 0);
    });
    return () => subscription.unsubscribe();
  }, [verify]);

  const onRecovered = async () => {
    recoveryRef.current = false;
    setRecovery(false);
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    const { data } = await supabase.auth.getSession();
    verify(data.session);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthError('');
  };

  if (checking && !recovery) return (
    <>
      <style>{css}</style>
      <div className="login-wrap"><span className="spinner" /></div>
    </>
  );

  if (!admin || recovery) return (
    <>
      <style>{css}</style>
      <Login key={recovery ? 'recovery' : 'login'} initialError={authError} recovery={recovery} onRecovered={onRecovered} />
      <div id="__toast" className="toast" />
    </>
  );

  const tabContent = {
    residents:       <ResidentsTab />,
    events:          <EventsTab />,
    news:            <NewsTab />,
    partners:        <PartnersTab />,
    polls:           <PollsTab />,
    rating:          <RatingTab />,
    points:          <PointsTab />,
    'points-rules':  <PointsRulesTab />,
    groups:          <GroupsTab />,
    onboarding:      <OnboardingTab />,
    'club-votes':    <ClubVotesTab />,
    knowledge:       <KnowledgeTab />,
    internal:        <InternalNotesTab />,
    president:       <PresidentTab />,
    'access-requests': <AccessRequestsTab />,
  };

  return (
    <>
      <style>{css}</style>
      <div className="admin-app">
        <div className="topbar">
          <div className="topbar-brand">26 Business Club <span>Админка</span></div>
          <div className="topbar-right">
            <span className="topbar-user" title={admin.email}>{admin.name}</span>
            <a href="/" className="topbar-link"><Ico i={ArrowLeft} /> На сайт</a>
            <button className="btn btn-outline btn-sm" onClick={logout}>Выйти</button>
          </div>
        </div>

        <nav className="sidebar">
          {TABS.map(t => (
            <React.Fragment key={t.id}>
              {t.section && <div className="sidebar-label">{t.section}</div>}
              <button className={`sidebar-btn ${tab === t.id ? 'active' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                <Ico i={t.icon} />
                {t.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <main className="main">
          <div className="main-inner">{tabContent[tab]}</div>
        </main>
      </div>
      <div id="__toast" className="toast" />
    </>
  );
};

export default Admin;
