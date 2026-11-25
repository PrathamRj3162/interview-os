-- 0011 · Whiteboard text per candidate turn (system design rounds). Written only by the server, like the rest of
-- the turn; it is what the interviewer saw, and what diagram evidence in the report is checked against.
alter table public.interview_turns add column if not exists board text check (board is null or char_length(board) <= 9000);
