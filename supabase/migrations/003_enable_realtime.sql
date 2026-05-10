-- Active la réplication realtime pour les tables que l'app web/mobile écoute.
-- À exécuter une seule fois côté Supabase (SQL Editor).

alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table journal_entries;
alter publication supabase_realtime add table credentials;
alter publication supabase_realtime add table ideas;
alter publication supabase_realtime add table todos;
