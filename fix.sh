#!/bin/bash
set -e
cd public

perl -pi -e 's{Mon&ndash;Sat, 10:00 AM &ndash; 8:30 PM}{Mon&ndash;Fri 8 AM &ndash; 10 PM, Sat 8 AM &ndash; 10:30 PM, Sun 8 AM &ndash; 11 PM}g' *.html

perl -pi -e 's{\+917207046387}{+917207046157}g' index.html contact.html

perl -pi -e 's{href="index\.html}{href="/}g; s{href="(contact|shop|service|portfolio|quotation|terms|privacy|refund-policy|shipping-policy)\.html}{href="/$1}g' *.html

perl -pi -e 's{<title>Wedding &amp; Event Photographer Hyderabad \| VK Photography Rampally</title>}{<title>Wedding &amp; Event Photographer Hyderabad | VK Photography</title>}' index.html
perl -pi -e 's{<title>Pre Wedding Shoot, Maternity &amp; Birthday Photographer Hyderabad</title>}{<title>Pre Wedding, Maternity &amp; Birthday Shoots Hyderabad</title>}' service.html
perl -pi -e 's{<title>Wedding Photography Portfolio Hyderabad \| VK Photography Rampally</title>}{<title>Wedding Photography Portfolio Hyderabad | VK Photography</title>}' portfolio.html
perl -pi -e 's{ See our work and request a quotation\."}{ Request a quotation."}' index.html

cd ..
rm -f apply-photo-cleanup.sh

echo "--- checks (all should be 0) ---"
grep -rn "10:00 AM" public/*.html | wc -l
grep -rn "7207046387" public/*.html | wc -l
grep -ohE 'href="[a-z-]+\.html' public/*.html | wc -l
