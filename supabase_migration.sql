-- ─────────────────────────────────────────────────────────────
-- 26 Business Club — Full Admin Migration
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- ── Residents ─────────────────────────────────────────────────
create table if not exists residents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  niche text,
  photo_url text,
  website text,
  brief text,
  is_president boolean default false,
  sort_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Events ────────────────────────────────────────────────────
create table if not exists site_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date,
  photo_url text,
  participants text[] default '{}',
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── President (singleton) ─────────────────────────────────────
create table if not exists president (
  id int primary key default 1,
  name text,
  bio text,
  photo_url text,
  updated_at timestamptz default now()
);

insert into president (id, name, bio, photo_url)
values (1, 'Тимур Нуртаев', 'Почетный строитель Республики Казахстан. Основатель компаний «ТИМУС Construction» и «TIMUS Development». Президент 26 Business Club.', null)
on conflict (id) do nothing;

-- ── RLS ───────────────────────────────────────────────────────
alter table residents enable row level security;
alter table site_events enable row level security;
alter table president enable row level security;

-- Public read
create policy "Public read residents"  on residents  for select using (is_published = true);
create policy "Public read events"     on site_events for select using (is_published = true);
create policy "Public read president"  on president  for select using (true);

-- Admin write (open for now — restrict later)
create policy "Admin insert residents" on residents  for insert with check (true);
create policy "Admin update residents" on residents  for update using (true);
create policy "Admin delete residents" on residents  for delete using (true);

create policy "Admin insert events"    on site_events for insert with check (true);
create policy "Admin update events"    on site_events for update using (true);
create policy "Admin delete events"    on site_events for delete using (true);

create policy "Admin update president" on president  for update using (true);

-- ── Storage bucket for media ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Public read media"
  on storage.objects for select using (bucket_id = 'media');

create policy "Admin upload media"
  on storage.objects for insert with check (bucket_id = 'media');

create policy "Admin delete media"
  on storage.objects for delete using (bucket_id = 'media');

-- ── Seed residents ────────────────────────────────────────────
insert into residents (name, company, niche, photo_url, website, brief, is_president, sort_order) values
('Тимур Нуртаев','TIMUS DEVELOPMENT','Строительство','/residents/IMG_5283.jpg','https://timusdevelopment.kz/','Почетный строитель Республики Казахстан. Основатель компаний «ТИМУС Construction» и «TIMUS Development». Президент 26 Business Club.',true,1),
('Ларион Лян','IC-Group','Клининг','/residents/Ларион Лян.JPG','https://ic-group.kz/','Управляет многоотраслевым холдингом с 5 000+ сотрудниками. Более 5 000 объектов в управлении.',false,2),
('Болат Джанабаев','Interlink Global Services','Логистика','/residents/Болат Джанабаев.jpg','http://interlinkgs.com/','Транспортно-логистическая компания',false,3),
('Кайрат Аубакиров','Садыхан','Фармацевтика','/residents/Кайрат Аубакиров.jpg','https://sadykhan.kz/','Сеть социальных аптек и медцентр',false,4),
('Федор Чередниченко','Mladex','Консалтинг','/residents/Федор Чередниченко.JPG','https://mladex.kz/','Консалтинг и IT в фармацевтике',false,5),
('Димаш Сабитов','Ломбард Белый, SoBes','Микрофинансы и HR-Tech','/residents/Димаш Сабитов.jpg','https://sobes.app/','Микрофинансовая деятельность и HR, AI-сервис для автоматизации рекрутинга',false,6),
('Ерлан Кунанбаев','АзияМебель, Школа Го им. Кунанбаева','Образование и мебельные материалы','/residents/Ерлан Кунанбаев.jpg','https://asiamebel.com/','Реализация плитного материала и фурнитуры, школа игры Го',false,7),
('Абиль Авиль','ABIS Group','Стройматериалы','/residents/Абиль Авиль.JPG','https://abis.kz/','Оптово-розничная торговля красок и световых решений',false,8),
('Сергей Ена','FERROOM','Противопожарное оборудование','/residents/Сергей Ена.JPG','https://ferroom.kz/','Производство противопожарной продукции и металлических шкафов',false,9),
('Денис Саттаров','Mastersky Group','IT и технологии','/residents/Денис Саттаров.jpg','https://mastersky.group/','Разработка и производство устройств самообслуживания',false,10),
('Сергей Хрущев','ТехНОвиД','Фасадные системы','/residents/Сергей Хрущёв.jpeg','https://khrushchyov.com/','Полный цикл фасадных решений',false,11),
('Ержан Калимулдиев','TEPLOSTIL','Фасадные термопанели','/residents/Ержан Калимулдиев.jpeg','https://teplostil.kz/','Производство фасадных термопанелей',false,12),
('Ярослав Шкабаро','CeZar Group & Gallery','Инженерное оборудование','/residents/Ярослав Шкабаро.jpg','https://cezar.kz/','Поставка отопительного оборудования',false,13),
('Жаркын Калелов','Expert Neuro','Медицина','/residents/Жаркын Калелов.jpeg','https://expertneuro.kz/','Сеть медицинских центров, специализирующихся на лечении болей в спине и суставов',false,14),
('Марат Успанов','Starget','Логистика','/residents/Марат Успанов.PNG','https://starget.kz/','Транспортно-логистическая компания',false,15),
('Владимир Ким','Maxipay','Финтех','/residents/Владимир Ким.jpg','https://maxipay.global/','Платежная организация в сфере процессинга и онлайн-сервисов',false,16),
('Александр Нестерцов','Nest Stroy','Строительство','/residents/Александр Нестерцов.jpg','https://gcity.kz/','Строительство',false,17),
('Валентин Казимиров','Ломбард CreditLine','Микрофинансы','/residents/Валентин Казимиров.jpg','https://creditline.kz/','Выдача микрокредитов под залог автотранспорта',false,18),
('Талгат Нурымов','Капиталтелеком','Телекоммуникации','/residents/Талгат Нурымов.jpg',null,'Телекоммуникации',false,19),
('Антон Смирнов','CAD Systems','IT','/residents/Антон Смирнов.JPG','https://cadsystems.kz/','Центр дистрибуции технологий для цифровизации строительной отрасли',false,20),
('Евгений Ким','HYDROSTA KAZAKHSTAN','Инженерные системы','/residents/Евгений Ким.jpg','https://hsta.kz/','Поставка и монтаж систем вентиляции, отопления, водоснабжения',false,21),
('Александр Саяпин','Стрельня','Агробизнес','/residents/Александр Саяпин.webp','https://sayapin.pro/','Первая роботизированная ферма в России, 2400 га земли, 1800 голов скота',false,22),
('Нурлан Байарстанов','KazElectroSnab','Электротехника','/residents/Нурлан Байарстанов.jpg','https://kes.kz/','Производство электротехнического оборудования, поставка ДГУ',false,23),
('Тамерлан Дюсембин','ТОО GENEX, ТОО DES-DRIVE','Электрооборудование','/residents/Тамерлан Дюсембин.jpg','https://genex-qazaqstan.kz/','Дизельные электростанции, мотор-редукторы',false,24),
('Жасулан Иманбаев','Казахстанско-российская сталепромышленная компания','Металлопрокат','/residents/Жасулан Иманбаев.jpeg','https://sspk.kz/','Оптовая поставка металлопроката',false,25)
on conflict do nothing;
