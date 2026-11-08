// Совместимость: EventsPage импортирует клиент отсюда. Второй createClient
// создавал бы второй GoTrueClient с тем же ключом хранения сессии — используем один.
export { supabase } from './lib/supabase';
