insert into public.products (id,kind,name,description,price,price_modifier,image,active,sort_order) values
('illuminated-frame','gift','Illuminated Photo Frame','Wooden LED photo frame, 5 x 7 in. Your photo is printed and lit from below.',2,null,'gifts/illuminated-photo-frame.webp',true,13)
on conflict (id) do nothing;
