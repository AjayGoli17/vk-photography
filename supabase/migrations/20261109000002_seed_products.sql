-- Seeded from js/shop-pricing.js. NOTE: create-order still prices from that file.
insert into public.products (id,kind,name,description,price,price_modifier,image,active,sort_order) values
('brick-brown','frame','Classic Brown','Dark brown frame with a thin gold line inside. Simple and timeless.',null,100,'frames/brick-brown.webp',true,0),
('mahogany','frame','Polished Wood','Glossy reddish-brown wood finish with a black inner edge. Classic and elegant.',null,0,'frames/mahogany.webp',true,1),
('grey-modern','frame','Modern Grey','Flat, smooth grey frame with a slim black edge. Clean and contemporary.',null,0,'frames/grey-modern.webp',true,2),
('red-lattice','frame','Red Diamond','Warm red-brown frame with a raised diamond pattern.',null,150,'frames/red-lattice.webp',true,3),
('burgundy-hex','frame','Wine Red','Deep wine-red frame with a fine dotted texture.',null,150,'frames/burgundy-hex.webp',true,4),
('gold-rope','frame','Royal Gold','Dark wine frame with a twisted gold rope edge. A great pick for weddings and festive gifts.',null,300,'frames/gold-rope.webp',true,5),
('copper-quilt','frame','Copper Glow','Shiny copper-coloured frame with a soft, cushioned diamond look.',null,200,'frames/copper-quilt.webp',true,6),
('basket-weave','frame','Woven Brown','Rich brown frame with a woven, tile-like texture.',null,200,'frames/basket-weave.webp',true,7),
('onyx-lattice','frame','Black Diamond','Black frame with a raised diamond pattern and a silver edge. Bold and stylish.',null,200,'frames/onyx-lattice.webp',true,8),
('bamboo-rope','frame','Natural Bamboo','Dark brown frame with a ribbed, bamboo-like texture.',null,250,'frames/bamboo-rope.webp',true,9),
('photo-mug','gift','Photo Mug','A white mug with your favorite photo printed on the front.',299,null,'gifts/photo-mug.jpg',true,10),
('heart-pillow','gift','Heart Pillow','A soft, fluffy red heart pillow with your photo set into the center.',399,null,'gifts/heart-pillow.jpg',true,11),
('magic-pillow','gift','Personalized Magic Pillow','A silver sequin cushion. Brush the sequins to reveal your photo.',899,null,'gifts/magic-pillow.jpg',true,12)
on conflict (id) do nothing;
