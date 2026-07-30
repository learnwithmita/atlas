-- ============================================================================
-- Atlas — seed content (G3 Biology + Chemistry). Safe to re-run.
-- Run AFTER 0001_init.sql. Content only — no user data.
-- ============================================================================

-- Subjects -------------------------------------------------------------------
insert into subjects (id, name, exam_body, syllabus_code, icon, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Biology',   'SEAB', '6093', 'leaf',  1),
  ('22222222-2222-2222-2222-222222222222', 'Chemistry', 'SEAB', '6092', 'flask', 2)
on conflict (id) do nothing;

-- Topics ---------------------------------------------------------------------
insert into topics (id, subject_id, name, sort_order) values
  ('a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Movement of Substances', 1),
  ('a0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Enzymes', 2),
  ('a0000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Nutrition in Humans', 3),
  ('b0000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Acids, Bases and Salts', 1),
  ('b0000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'The Particulate Nature of Matter', 2)
on conflict (id) do nothing;

-- Subtopics ------------------------------------------------------------------
insert into subtopics (id, topic_id, name, sort_order) values
  ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Diffusion', 1),
  ('c0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Osmosis', 2),
  ('c0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'Active Transport', 3),
  ('c0000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'Enzyme Action & Factors', 1),
  ('c0000005-0000-0000-0000-000000000005', 'a0000003-0000-0000-0000-000000000003', 'Enzymic Digestion', 1),
  ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'The pH Scale', 1),
  ('d0000002-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'Preparation of Salts', 2),
  ('d0000003-0000-0000-0000-000000000003', 'b0000002-0000-0000-0000-000000000002', 'States of Matter', 1)
on conflict (id) do nothing;

-- Learning outcomes (frequency_score 1..5) -----------------------------------
insert into learning_outcomes (id, subtopic_id, code, statement, frequency_score) values
  ('e0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 'B1.2a', 'Define osmosis as the net movement of water molecules from a region of higher water potential to a region of lower water potential, through a partially permeable membrane', 5),
  ('e0000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', 'B1.2b', 'Explain the effects of immersing plant and animal cells in solutions of different concentrations', 5),
  ('e0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'B1.1a', 'Define diffusion and describe its role in the movement of substances', 4),
  ('e0000004-0000-0000-0000-000000000004', 'c0000003-0000-0000-0000-000000000003', 'B1.3a', 'Explain active transport as movement of ions against a concentration gradient using energy from respiration', 3),
  ('e0000005-0000-0000-0000-000000000005', 'c0000004-0000-0000-0000-000000000004', 'B2.1a', 'Explain the effect of temperature and pH on enzyme activity', 5),
  ('e0000006-0000-0000-0000-000000000006', 'c0000005-0000-0000-0000-000000000005', 'B3.1a', 'Describe the enzymic digestion of starch, protein and fats', 4),
  ('f0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'C1.1a', 'Describe the use of universal indicator and pH to measure acidity/alkalinity', 4),
  ('f0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 'C1.2a', 'Describe the preparation of soluble and insoluble salts', 5),
  ('f0000003-0000-0000-0000-000000000003', 'd0000003-0000-0000-0000-000000000003', 'C2.1a', 'Describe the changes of state in terms of the kinetic particle theory', 3)
on conflict (id) do nothing;

-- A worked lesson: Osmosis ---------------------------------------------------
insert into lessons (id, subtopic_id, overview, simple_explanation, detailed_explanation, exam_tips, analogy, misconceptions) values
  ('99999999-0000-0000-0000-000000000001',
   'c0000002-0000-0000-0000-000000000002',
   'Osmosis is the movement of water across a partially permeable membrane, driven by differences in water potential.',
   'Water moves from where there is lots of it (dilute solution) to where there is less of it (concentrated solution), through a membrane that lets water pass but not the dissolved particles.',
   'Osmosis is the net movement of water molecules from a region of higher water potential to a region of lower water potential, through a partially permeable membrane. In plant cells, water entering makes the cell turgid; water leaving causes plasmolysis. In animal cells (no cell wall), too much water causes the cell to burst (haemolysis); too little causes it to crenate.',
   'Always use the exact phrase "net movement of water molecules" and "partially permeable membrane". Reference "water potential" (higher → lower), not just "concentration". For plant cells use turgid/flaccid/plasmolysed; for animal cells use burst/crenate.',
   'Think of a crowded room (concentrated solution) and an empty room (dilute) joined by a door that only people (water) can fit through — people spread out until both rooms feel equally full.',
   '[{"claim":"Osmosis moves solute particles","correction":"Osmosis is the movement of WATER only; solutes cannot cross the partially permeable membrane."},{"claim":"Water moves from low to high concentration of water","correction":"Water moves from HIGH water potential (dilute) to LOW water potential (concentrated)."}]'::jsonb)
on conflict (id) do nothing;

-- Questions + mark schemes ---------------------------------------------------
insert into questions (id, subject_id, subtopic_id, stem, type, marks, command_words, difficulty, frequency_score) values
  ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000002-0000-0000-0000-000000000002',
   'Define osmosis.', 'open_ended', 3, '{define}', 2, 5),
  ('10000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000002-0000-0000-0000-000000000002',
   'A plant cell is placed in a concentrated sugar solution. Explain what happens to the cell.', 'open_ended', 4, '{explain}', 4, 5),
  ('10000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000004-0000-0000-0000-000000000004',
   'Explain why enzyme activity decreases above its optimum temperature.', 'open_ended', 3, '{explain}', 3, 5),
  ('10000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c0000001-0000-0000-0000-000000000001',
   'Which process describes the net movement of particles from a region of higher concentration to a region of lower concentration?', 'mcq', 1, '{}', 1, 4),
  ('20000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'd0000001-0000-0000-0000-000000000001',
   'A solution turns universal indicator red. State what this tells you about the solution.', 'open_ended', 2, '{state}', 2, 4)
on conflict (id) do nothing;

insert into question_options (question_id, label, text, is_correct, distractor_rationale) values
  ('10000000-0000-0000-0000-000000000004', 'A', 'Active transport', false, 'Active transport moves particles AGAINST the gradient using energy.'),
  ('10000000-0000-0000-0000-000000000004', 'B', 'Diffusion', true, null),
  ('10000000-0000-0000-0000-000000000004', 'C', 'Osmosis', false, 'Osmosis is specifically the movement of WATER across a partially permeable membrane.'),
  ('10000000-0000-0000-0000-000000000004', 'D', 'Respiration', false, 'Respiration is a chemical reaction releasing energy, not particle movement.')
on conflict do nothing;

insert into mark_schemes (question_id, marking_points, model_answer, accepted_keywords, rejected_answers) values
  ('10000000-0000-0000-0000-000000000001',
   '["net movement of water molecules","from higher to lower water potential","through a partially permeable membrane"]'::jsonb,
   'Osmosis is the net movement of water molecules from a region of higher water potential to a region of lower water potential, through a partially permeable membrane.',
   '{net movement,water molecules,water potential,partially permeable membrane}',
   '{"movement of water (missing net)","semi-permeable (accept, prefer partially permeable)","movement of particles"}'),
  ('10000000-0000-0000-0000-000000000002',
   '["water potential inside cell is higher than solution","water leaves the cell by osmosis","across the partially permeable membrane","cell becomes flaccid / plasmolysed"]'::jsonb,
   'The sugar solution has a lower water potential than the cell sap. Water therefore moves out of the cell by osmosis, across the partially permeable membrane. The cell loses turgor, becomes flaccid and eventually plasmolysed as the membrane pulls away from the cell wall.',
   '{lower water potential,osmosis,partially permeable,flaccid,plasmolysed}',
   '{"cell bursts (that is animal cells in dilute solution)"}'),
  ('10000000-0000-0000-0000-000000000003',
   '["high temperature denatures the enzyme","active site changes shape","substrate no longer fits","fewer enzyme-substrate complexes form"]'::jsonb,
   'Above the optimum, the high temperature denatures the enzyme: the active site changes shape so the substrate no longer fits, so fewer enzyme-substrate complexes form and the rate falls.',
   '{denatured,active site,changes shape,substrate,no longer fits}',
   '{"enzyme is killed (enzymes are not alive)"}'),
  ('20000000-0000-0000-0000-000000000001',
   '["the solution is acidic","it has a low pH / pH below 7"]'::jsonb,
   'The solution is acidic; it has a low pH (below 7).',
   '{acidic,low pH,below 7}',
   '{"alkaline","neutral"}')
on conflict (question_id) do nothing;

insert into question_outcomes (question_id, learning_outcome_id, weight) values
  ('10000000-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000001',1),
  ('10000000-0000-0000-0000-000000000002','e0000002-0000-0000-0000-000000000002',1),
  ('10000000-0000-0000-0000-000000000003','e0000005-0000-0000-0000-000000000005',1),
  ('10000000-0000-0000-0000-000000000004','e0000003-0000-0000-0000-000000000003',1),
  ('20000000-0000-0000-0000-000000000001','f0000001-0000-0000-0000-000000000001',1)
on conflict do nothing;
