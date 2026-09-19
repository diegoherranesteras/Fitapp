-- Rellena la app con la rutina de boxeo/gym y las comidas que ya tenías en la web.
-- 1) Regístrate una vez en la app (o en Authentication > Users del panel de Supabase).
-- 2) Copia tu User UID desde Authentication > Users.
-- 3) Pega ese UID abajo en v_user_id y ejecuta este script entero en el SQL Editor.

do $$
declare
  v_user_id uuid := 'REPLACE_WITH_YOUR_USER_ID'; -- <-- cambia esto
  d_id uuid;
  b_id uuid;
begin

  -- ══════════════════════ LUNES — Pierna · Gym ══════════════════════
  insert into routine_days (user_id, day_of_week, label, accent_color)
    values (v_user_id, 1, 'Pierna · Gym', '#E2B24E') returning id into d_id;

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:30', 'rest', 'Despertar', null, 1);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:45', 'meal', 'Pre-entreno', 'plátano + yogur', 2) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Plátano', '1 (~120 g)', 1), (b_id, 'Yogur griego natural', '125 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '08:30', 'train', 'Gym · Pierna', 'pesada + potencia cadera', 3) returning id into b_id;
  insert into exercises (routine_block_id, name, target_display, sets_count, sort_order, note) values
    (b_id, 'Sentadilla trasera', '4×5', 4, 1, 'Base pesada (sentadilla + RDL) igual que siempre, pero el swing de kettlebell es la pieza clave: potencia de cadera explosiva, directa a velocidad de golpe.'),
    (b_id, 'Peso muerto rumano', '3×8', 3, 2, null),
    (b_id, 'Kettlebell swing (explosivo)', '4×15', 4, 3, null),
    (b_id, 'Zancada con rotación', '3×10/lado', 3, 4, null),
    (b_id, 'Gemelos', '4×15', 4, 5, null),
    (b_id, 'Plancha con rotación (core)', '3×30 s', 3, 6, null);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '10:00', 'meal', 'Desayuno fuerte', 'avena + huevos + fruta', 4) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Avena (en seco)', '110 g', 1), (b_id, 'Leche entera', '350 ml', 2), (b_id, 'Huevos', '3', 3), (b_id, 'Plátano o fruta', '1', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '11:00', 'rest', 'Tiempo libre', 'tus cosas', 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '14:00', 'meal', 'Comida', 'arroz + pollo + verdura', 6) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Arroz o pasta (en crudo)', '170 g', 1), (b_id, 'Pollo o ternera (en crudo)', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '2 cda (20 ml)', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '15:30', 'meal', 'Snack', 'fruta + frutos secos', 7) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Fruta', '1', 1), (b_id, 'Frutos secos', '35 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '16:00', 'rest', 'Clase / trabajo', null, 8);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '21:00', 'meal', 'Cena', 'pescado + patata', 9) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Patata (o 150 g de arroz)', '350 g', 1), (b_id, 'Pescado, pollo o huevos', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '1 cda (15 ml)', 4), (b_id, 'Pan integral', '60 g', 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '22:30', 'rest', 'Desconexión', null, 10);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '23:30', 'rest', 'Dormir', '~8 h', 11);


  -- ══════════════════════ MARTES — Empuje + Boxeo · doble ══════════════════════
  insert into routine_days (user_id, day_of_week, label, accent_color)
    values (v_user_id, 2, 'Empuje + Boxeo · doble', '#E2954A') returning id into d_id;

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:15', 'rest', 'Despertar', null, 1);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:30', 'meal', 'Pre-entreno', 'plátano + yogur', 2) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Plátano', '1 (~120 g)', 1), (b_id, 'Yogur griego natural', '125 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '08:30', 'train', 'Gym · Empuje', '+ potencia superior', 3) returning id into b_id;
  insert into exercises (routine_block_id, name, target_display, sets_count, sort_order, note) values
    (b_id, 'Press banca', '4×6', 4, 1, 'El landmine (barra anclada al suelo) es la herramienta que más usa Aldo: presión + rotación con transferencia directa al ring.'),
    (b_id, 'Landmine press (unilateral)', '3×10/lado', 3, 2, null),
    (b_id, 'Lanzamiento balón medicinal (chest pass)', '4×6', 4, 3, null),
    (b_id, 'Press militar', '3×8', 3, 4, null),
    (b_id, 'Fondos', '3×10', 3, 5, null),
    (b_id, 'Balón medicinal slam (core)', '3×10', 3, 6, null);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '09:45', 'meal', 'Refuel', 'fruta + batido', 4) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Proteína en polvo', '1 cazo (~30 g)', 1), (b_id, 'Agua o leche', 'a gusto', 2), (b_id, 'Plátano', '1', 3);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '10:15', 'train', 'Boxeo', 'técnica + cardio', 5) returning id into b_id;
  insert into exercises (routine_block_id, name, target_display, sets_count, sort_order, note) values
    (b_id, 'Calentamiento + comba', '10 min', 0, 1, null),
    (b_id, 'Sombra', '3×3 min', 3, 2, null),
    (b_id, 'Saco', '4×3 min', 4, 3, null),
    (b_id, 'Manoplas / técnica', '4×3 min', 4, 4, null),
    (b_id, 'Core + acondicionamiento', '10 min', 0, 5, null),
    (b_id, 'Estiramientos', '5 min', 0, 6, null);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '11:30', 'meal', 'Desayuno fuerte', 'avena + huevos', 6) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Avena (en seco)', '110 g', 1), (b_id, 'Leche entera', '350 ml', 2), (b_id, 'Huevos', '3', 3), (b_id, 'Plátano o fruta', '1', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '14:00', 'meal', 'Comida', 'pasta + ternera + verdura', 7) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Arroz o pasta (en crudo)', '170 g', 1), (b_id, 'Pollo o ternera (en crudo)', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '2 cda (20 ml)', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '16:00', 'rest', 'Clase / trabajo', null, 8);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '21:00', 'meal', 'Cena', 'pollo + arroz', 9) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Patata (o 150 g de arroz)', '350 g', 1), (b_id, 'Pescado, pollo o huevos', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '1 cda (15 ml)', 4), (b_id, 'Pan integral', '60 g', 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '22:30', 'rest', 'Desconexión', null, 10);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '23:30', 'rest', 'Dormir', null, 11);


  -- ══════════════════════ MIÉRCOLES — Boxeo ══════════════════════
  insert into routine_days (user_id, day_of_week, label, accent_color)
    values (v_user_id, 3, 'Boxeo', '#E07C42') returning id into d_id;

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:30', 'rest', 'Despertar', null, 1);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:45', 'meal', 'Pre-entreno', 'plátano', 2) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Plátano', '1 (~120 g)', 1), (b_id, 'Yogur griego natural', '125 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '08:30', 'train', 'Boxeo', 'técnica + cardio', 3) returning id into b_id;
  insert into exercises (routine_block_id, name, target_display, sets_count, sort_order, note) values
    (b_id, 'Calentamiento + comba', '10 min', 0, 1, null),
    (b_id, 'Sombra', '3×3 min', 3, 2, null),
    (b_id, 'Saco', '4×3 min', 4, 3, null),
    (b_id, 'Manoplas / técnica', '4×3 min', 4, 4, null),
    (b_id, 'Core + acondicionamiento', '10 min', 0, 5, null),
    (b_id, 'Estiramientos', '5 min', 0, 6, null);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '10:00', 'meal', 'Desayuno fuerte', 'avena + huevos', 4) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Avena (en seco)', '110 g', 1), (b_id, 'Leche entera', '350 ml', 2), (b_id, 'Huevos', '3', 3), (b_id, 'Plátano o fruta', '1', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '11:00', 'rest', 'Tiempo libre', null, 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '14:00', 'meal', 'Comida', 'arroz + pollo + verdura', 6) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Arroz o pasta (en crudo)', '170 g', 1), (b_id, 'Pollo o ternera (en crudo)', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '2 cda (20 ml)', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '15:30', 'meal', 'Snack', 'yogur + fruta', 7) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Fruta', '1', 1), (b_id, 'Frutos secos', '35 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '16:00', 'rest', 'Clase / trabajo', null, 8);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '21:00', 'meal', 'Cena', 'huevos + patata', 9) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Patata (o 150 g de arroz)', '350 g', 1), (b_id, 'Pescado, pollo o huevos', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '1 cda (15 ml)', 4), (b_id, 'Pan integral', '60 g', 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '22:30', 'rest', 'Desconexión', null, 10);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '23:30', 'rest', 'Dormir', null, 11);


  -- ══════════════════════ JUEVES — Tirón + Boxeo · doble ══════════════════════
  insert into routine_days (user_id, day_of_week, label, accent_color)
    values (v_user_id, 4, 'Tirón + Boxeo · doble', '#DA5C3E') returning id into d_id;

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:15', 'rest', 'Despertar', null, 1);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:30', 'meal', 'Pre-entreno', 'plátano + yogur', 2) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Plátano', '1 (~120 g)', 1), (b_id, 'Yogur griego natural', '125 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '08:30', 'train', 'Gym · Tirón', '+ potencia rotacional', 3) returning id into b_id;
  insert into exercises (routine_block_id, name, target_display, sets_count, sort_order, note) values
    (b_id, 'Dominadas o jalón', '4×6-8', 4, 1, 'La rotación de core con landmine es la base de la potencia del cruzado/gancho.'),
    (b_id, 'Remo landmine (unilateral)', '3×10/lado', 3, 2, null),
    (b_id, 'Rotación landmine (core)', '3×10/lado', 3, 3, null),
    (b_id, 'Face pulls', '3×15', 3, 4, null),
    (b_id, 'Curl con barra', '3×10', 3, 5, null),
    (b_id, 'Pallof press (anti-rotación)', '3×10/lado', 3, 6, null);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '09:45', 'meal', 'Refuel', 'fruta + batido', 4) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Proteína en polvo', '1 cazo (~30 g)', 1), (b_id, 'Agua o leche', 'a gusto', 2), (b_id, 'Plátano', '1', 3);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '10:15', 'train', 'Boxeo', 'técnica + cardio', 5) returning id into b_id;
  insert into exercises (routine_block_id, name, target_display, sets_count, sort_order, note) values
    (b_id, 'Calentamiento + comba', '10 min', 0, 1, null),
    (b_id, 'Sombra', '3×3 min', 3, 2, null),
    (b_id, 'Saco', '4×3 min', 4, 3, null),
    (b_id, 'Manoplas / técnica', '4×3 min', 4, 4, null),
    (b_id, 'Core + acondicionamiento', '10 min', 0, 5, null),
    (b_id, 'Estiramientos', '5 min', 0, 6, null);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '11:30', 'meal', 'Desayuno fuerte', 'avena + huevos', 6) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Avena (en seco)', '110 g', 1), (b_id, 'Leche entera', '350 ml', 2), (b_id, 'Huevos', '3', 3), (b_id, 'Plátano o fruta', '1', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '14:00', 'meal', 'Comida', 'pasta + ternera + verdura', 7) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Arroz o pasta (en crudo)', '170 g', 1), (b_id, 'Pollo o ternera (en crudo)', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '2 cda (20 ml)', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '16:00', 'rest', 'Clase / trabajo', null, 8);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '21:00', 'meal', 'Cena', 'pescado + patata', 9) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Patata (o 150 g de arroz)', '350 g', 1), (b_id, 'Pescado, pollo o huevos', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '1 cda (15 ml)', 4), (b_id, 'Pan integral', '60 g', 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '22:30', 'rest', 'Desconexión', null, 10);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '23:30', 'rest', 'Dormir', null, 11);


  -- ══════════════════════ VIERNES — Boxeo ══════════════════════
  insert into routine_days (user_id, day_of_week, label, accent_color)
    values (v_user_id, 5, 'Boxeo', '#D75E66') returning id into d_id;

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:30', 'rest', 'Despertar', null, 1);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '07:45', 'meal', 'Pre-entreno', 'plátano + yogur', 2) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Plátano', '1 (~120 g)', 1), (b_id, 'Yogur griego natural', '125 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '08:30', 'train', 'Boxeo', 'técnica + cardio, sin lastre de gym', 3) returning id into b_id;
  insert into exercises (routine_block_id, name, target_display, sets_count, sort_order, note) values
    (b_id, 'Calentamiento + comba', '10 min', 0, 1, null),
    (b_id, 'Sombra', '3×3 min', 3, 2, null),
    (b_id, 'Saco', '4×3 min', 4, 3, null),
    (b_id, 'Manoplas / técnica', '4×3 min', 4, 4, null),
    (b_id, 'Core + acondicionamiento', '10 min', 0, 5, null),
    (b_id, 'Estiramientos', '5 min', 0, 6, null);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '10:00', 'meal', 'Desayuno fuerte', 'avena + huevos', 4) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Avena (en seco)', '110 g', 1), (b_id, 'Leche entera', '350 ml', 2), (b_id, 'Huevos', '3', 3), (b_id, 'Plátano o fruta', '1', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '11:00', 'rest', 'Tiempo libre', null, 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '14:00', 'meal', 'Comida', 'arroz + pollo + verdura', 6) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Arroz o pasta (en crudo)', '170 g', 1), (b_id, 'Pollo o ternera (en crudo)', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '2 cda (20 ml)', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '15:30', 'meal', 'Snack', 'fruta + frutos secos', 7) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Fruta', '1', 1), (b_id, 'Frutos secos', '35 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '16:00', 'rest', 'Clase / trabajo', null, 8);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '21:00', 'meal', 'Cena', 'pollo + arroz', 9) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Patata (o 150 g de arroz)', '350 g', 1), (b_id, 'Pescado, pollo o huevos', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '1 cda (15 ml)', 4), (b_id, 'Pan integral', '60 g', 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '22:30', 'rest', 'Desconexión', null, 10);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '23:30', 'rest', 'Dormir', null, 11);


  -- ══════════════════════ SÁBADO — Pierna ligera · Gym ══════════════════════
  insert into routine_days (user_id, day_of_week, label, accent_color)
    values (v_user_id, 6, 'Pierna ligera · Gym', '#CF7280') returning id into d_id;

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '08:30', 'rest', 'Despertar', 'duerme más', 1);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '08:45', 'meal', 'Pre-entreno', 'plátano + yogur', 2) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Plátano', '1 (~120 g)', 1), (b_id, 'Yogur griego natural', '125 g', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '09:30', 'train', 'Gym · Pierna', 'ligera + pliometría/agilidad', 3) returning id into b_id;
  insert into exercises (routine_block_id, name, target_display, sets_count, sort_order, note) values
    (b_id, 'Hip thrust', '4×10', 4, 1, 'Comba + escalera = ritmo y coordinación de pies, la parte que menos se entrena en un gym normal y más pesa en el ring.'),
    (b_id, 'Comba', '10 min', 0, 2, null),
    (b_id, 'Escalera de agilidad', '4 series', 0, 3, null),
    (b_id, 'Salto al cajón (pliometría)', '4×6', 4, 4, null),
    (b_id, 'Zancada búlgara', '3×10/lado', 3, 5, null),
    (b_id, 'Gemelos', '4×15', 4, 6, null);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '11:00', 'meal', 'Desayuno fuerte', 'avena + fruta', 4) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Avena (en seco)', '110 g', 1), (b_id, 'Leche entera', '350 ml', 2), (b_id, 'Huevos', '3', 3), (b_id, 'Plátano o fruta', '1', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '12:00', 'rest', 'Tiempo libre', 'tus cosas', 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '14:00', 'meal', 'Comida', 'arroz + carne + verdura', 6) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Arroz o pasta (en crudo)', '170 g', 1), (b_id, 'Pollo o ternera (en crudo)', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '2 cda (20 ml)', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '16:00', 'rest', 'Tiempo libre', null, 7);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '21:00', 'meal', 'Cena', 'pescado + patata', 8) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Patata (o 150 g de arroz)', '350 g', 1), (b_id, 'Pescado, pollo o huevos', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '1 cda (15 ml)', 4), (b_id, 'Pan integral', '60 g', 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '23:00', 'rest', 'Tiempo libre', null, 9);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '00:00', 'rest', 'Dormir', null, 10);


  -- ══════════════════════ DOMINGO — Descanso ══════════════════════
  insert into routine_days (user_id, day_of_week, label, accent_color)
    values (v_user_id, 0, 'Descanso', '#9B897D') returning id into d_id;

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '09:00', 'rest', 'Despertar', 'sin prisa', 1);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '09:30', 'meal', 'Desayuno', 'huevos + fruta', 2) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Huevos', '3', 1), (b_id, 'Fruta', '1', 2);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '11:00', 'rest', 'Día libre', 'tus cosas', 3);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '14:00', 'meal', 'Comida', 'con proteína', 4) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Arroz o pasta (en crudo)', '170 g', 1), (b_id, 'Pollo o ternera (en crudo)', '210 g', 2), (b_id, 'Verdura variada', '250 g', 3), (b_id, 'Aceite de oliva', '2 cda (20 ml)', 4);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '16:00', 'rest', 'Tiempo libre', null, 5);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '20:30', 'meal', 'Cena', 'proteína + verdura', 6) returning id into b_id;
  insert into meal_items (routine_block_id, name, quantity, sort_order) values
    (b_id, 'Pescado, pollo o huevos', '210 g', 1), (b_id, 'Verdura variada', '250 g', 2), (b_id, 'Aceite de oliva', '1 cda (15 ml)', 3);

  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '22:30', 'rest', 'Desconexión', null, 7);
  insert into routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
    values (d_id, '23:30', 'rest', 'Dormir', 'listo pa''l lunes', 8);

end $$;
