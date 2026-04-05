-- AddUniqueConstraint: funds(name, vintage_year)
CREATE UNIQUE INDEX "funds_name_vintage_year_key" ON "funds"("name", "vintage_year");
