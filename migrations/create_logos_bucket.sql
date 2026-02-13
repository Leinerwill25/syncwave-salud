-- Create a new private bucket 'logos' for storing medical report logos
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Set up security policies for the 'logos' bucket

-- 1. Allow authenticated users (doctors) to upload their own logos
create policy "Authenticated users can upload logos"
on storage.objects for insert
with check ( bucket_id = 'logos' and auth.role() = 'authenticated' );

-- 2. Allow public access to view/download the logos (since they are for reports)
create policy "Public can view logos"
on storage.objects for select
using ( bucket_id = 'logos' );

-- 3. Allow users to update/delete their own files (optional, but good for management)
create policy "Users can update their own logos"
on storage.objects for update
using ( bucket_id = 'logos' and auth.uid() = owner )
with check ( bucket_id = 'logos' and auth.uid() = owner );

create policy "Users can delete their own logos"
on storage.objects for delete
using ( bucket_id = 'logos' and auth.uid() = owner );
