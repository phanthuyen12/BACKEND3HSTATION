ALTER TABLE facebook_leads
  ADD COLUMN current_intent VARCHAR(100) DEFAULT NULL AFTER course_interest,
  ADD COLUMN current_stage INT DEFAULT NULL AFTER current_intent,
  ADD COLUMN last_question_asked TEXT DEFAULT NULL AFTER current_stage,
  ADD COLUMN session_memory TEXT DEFAULT NULL AFTER last_question_asked;
