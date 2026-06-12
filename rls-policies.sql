-- Habilitar edição, exclusão e inserção para todos (Acesso Público Total)

-- 1. Políticas para locais_pesca
CREATE POLICY "Permitir leitura pública de locais" ON locais_pesca FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública de locais" ON locais_pesca FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública de locais" ON locais_pesca FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública de locais" ON locais_pesca FOR DELETE USING (true);

-- 2. Políticas para peixes
CREATE POLICY "Permitir leitura pública de peixes" ON peixes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública de peixes" ON peixes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública de peixes" ON peixes FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública de peixes" ON peixes FOR DELETE USING (true);

-- (Opcional) Alternativa rápida: Você também pode simplesmente desativar o RLS nessas tabelas se for um app apenas para amigos
-- ALTER TABLE locais_pesca DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE peixes DISABLE ROW LEVEL SECURITY;
