-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Branches Table
create table branches (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Semesters Table
create table semesters (
  id uuid default uuid_generate_v4() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Subjects Table
create table subjects (
  id uuid default uuid_generate_v4() primary key,
  semester_id uuid references semesters(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Units Table (Stores PDF info)
create table units (
  id uuid default uuid_generate_v4() primary key,
  subject_id uuid references subjects(id) on delete cascade not null,
  unit_number text not null, -- e.g. "Unit 1"
  title text not null,       -- e.g. "Introduction to Algorithms"
  pdf_url text not null,     -- Public URL of the PDF
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table branches enable row level security;
alter table semesters enable row level security;
alter table subjects enable row level security;
alter table units enable row level security;

-- Create Policies (Allow Public Read Access)
create policy "Allow public read access on branches" on branches for select using (true);
create policy "Allow public read access on semesters" on semesters for select using (true);
create policy "Allow public read access on subjects" on subjects for select using (true);
create policy "Allow public read access on units" on units for select using (true);

-- Helpful views or seed data can be added below
-- Insert Sample Data (Optional, for testing directly in SQL editor)
/*
do $$
declare
  b_id uuid;
  s_id uuid;
  sub_id uuid;
begin
  insert into branches (name) values ('Computer Engineering') returning id into b_id;
  insert into semesters (branch_id, name) values (b_id, 'Semester 3') returning id into s_id;
  insert into subjects (semester_id, name) values (s_id, 'Data Structures') returning id into sub_id;
  insert into units (subject_id, unit_number, title, pdf_url) values 
    (sub_id, 'Unit 1', 'Introduction & Arrays', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'),
    (sub_id, 'Unit 2', 'Linked Lists', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
end $$;
*/
