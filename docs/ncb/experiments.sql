-- The two tables behind the Experiments section, as they were added to the
-- live database on 9 November 2026 through NoCodeBackend's execute_sql tool.
--
-- NCB has no "add a table" call once a database exists, so each new table
-- was made as a copy of an existing one. That gives it the same id and
-- user_id columns NCB put on the originals, which is what its data API
-- needs to fill user_id from the session and filter reads by it. The copy
-- was then reshaped. Ids are BIGINT; a plain INT cannot be linked to them.
--
-- Run once, in order, on a database that does not have these tables yet.

CREATE TABLE lifeos_experiments LIKE lifeos_habits;
ALTER TABLE lifeos_experiments
  CHANGE name action VARCHAR(500) NULL,
  CHANGE description curiosity TEXT NULL,
  CHANGE stack_anchor worked TEXT NULL,
  CHANGE reward did_not TEXT NULL,
  CHANGE protection next_step TEXT NULL,
  DROP COLUMN archived,
  ADD COLUMN start_date DATE NULL,
  ADD COLUMN length_days INT NULL,
  ADD COLUMN status VARCHAR(32) NULL,
  ADD COLUMN outcome VARCHAR(32) NULL,
  ADD COLUMN closed_at DATETIME NULL,
  ADD COLUMN previous_id BIGINT NULL,
  ADD COLUMN habit_id BIGINT NULL;
CREATE INDEX idx_lifeos_experiments_user_status ON lifeos_experiments (user_id, status);
ALTER TABLE lifeos_experiments
  ADD CONSTRAINT fk_lifeos_experiments_user FOREIGN KEY (user_id)
  REFERENCES ncba_user (id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Copied from the habit completions table, so the rule "one row per habit
-- per day" arrives as "one row per experiment per day".
CREATE TABLE lifeos_experiment_days LIKE lifeos_habit_completions;
ALTER TABLE lifeos_experiment_days
  CHANGE habit_id experiment_id BIGINT NULL,
  CHANGE completion_date entry_date DATE NULL,
  ADD COLUMN done TINYINT(1) NULL,
  ADD COLUMN reason VARCHAR(16) NULL,
  ADD COLUMN updated_at DATETIME NULL;
ALTER TABLE lifeos_experiment_days
  ADD CONSTRAINT fk_lifeos_experiment_days_user FOREIGN KEY (user_id)
  REFERENCES ncba_user (id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE lifeos_experiment_days
  ADD CONSTRAINT fk_lifeos_experiment_days_experiment FOREIGN KEY (experiment_id)
  REFERENCES lifeos_experiments (id) ON DELETE CASCADE ON UPDATE CASCADE;
