-- Positivity rate (World)
WITH Filtered(record_date, daily_tests, daily_positive_cases, country_id) AS
(
    SELECT
        record_date,
        daily_tests,
        daily_positive_cases,
        country_id
    FROM Country_covid_data
    WHERE
        (daily_tests IS NOT NULL) AND
        (daily_positive_cases IS NOT NULL) AND
        (daily_tests > daily_positive_cases) AND
        (country_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10))
)
SELECT
   f.record_date,
   f.daily_tests,
   f.daily_positive_cases,
   ROUND(((f.daily_positive_cases / f.daily_tests) * 100), 2) AS positivity_rate,
   c.id AS country_id,
   c.name
FROM Filtered f
INNER JOIN Country c
ON f.country_id = c.id;


-- Death rate (US)
WITH Filtered(record_date, state_daily_positive_cases, state_daily_deaths, state_id) AS
(
    SELECT
        f1.record_date,
        SUM(f1.daily_positive_cases) AS state_daily_positive_cases,
        SUM(f1.daily_deaths) AS state_daily_deaths,
        f2.state_id AS state_id
    FROM
    (
        SELECT
            record_date,
            daily_positive_cases,
            daily_deaths,
            county_id
        FROM County_covid_data
        WHERE
             county_id IN
            (
                SELECT id FROM County
                WHERE state_id IN (1, 2, 3, 4, 5)
            )
    ) f1 INNER JOIN County f2
    ON f1.county_id = f2.id
    GROUP BY f1.record_date, f2.state_id
)
SELECT
    record_date,
    state_cumulative_positive_cases,
    state_cumulative_deaths,
    CASE
        WHEN state_cumulative_positive_cases=0 THEN 0
        ELSE ROUND((state_cumulative_deaths / state_cumulative_positive_cases) * 100, 2)
    END AS death_rate,
    state_id
FROM
(
    SELECT
        record_date,
        state_daily_positive_cases,
        NVL(SUM (state_daily_positive_cases) OVER (PARTITION BY state_id ORDER BY record_date), 0) AS state_cumulative_positive_cases,
        state_daily_deaths,
        NVL(SUM (state_daily_deaths) OVER (PARTITION BY state_id ORDER BY record_date), 0) AS state_cumulative_deaths,
        state_id
    FROM Filtered
)
ORDER BY state_id, record_date;


-- Death rate (World)
WITH Filtered(record_date, country_daily_positive_cases, country_daily_deaths, country_id) AS
(
    SELECT
        record_date,
        daily_positive_cases AS country_daily_positive_cases,
        daily_deaths AS country_daily_deaths,
        country_id
    FROM "N.SAOJI".Country_covid_data
    WHERE country_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
)
SELECT
    record_date,
    country_cumulative_positive_cases,
    country_cumulative_deaths,
    CASE
        WHEN country_cumulative_positive_cases=0 THEN 0
        ELSE ROUND((country_cumulative_deaths / country_cumulative_positive_cases) * 100, 2)
    END AS death_rate,
    country_id
FROM
(
    SELECT
        record_date,
        country_daily_positive_cases,
        NVL(SUM (country_daily_positive_cases) OVER (PARTITION BY country_id ORDER BY record_date), 0) AS country_cumulative_positive_cases,
        country_daily_deaths,
        NVL(SUM (country_daily_deaths) OVER (PARTITION BY country_id ORDER BY record_date), 0) AS country_cumulative_deaths,
        country_id
    FROM Filtered
)
ORDER BY country_id, record_date;


-- Community transmission (US)
WITH Filtered(id, record_date, daily_positive_cases, daily_deaths, county_id) AS
(
    SELECT
        id,
        record_date,
        daily_positive_cases,
        daily_deaths,
        county_id
    FROM "N.SAOJI".County_covid_data
    WHERE
         county_id IN
        (
            SELECT id FROM "N.SAOJI".County
            WHERE state_id IN (1)
        )
)
SELECT
    record_date,
    state_id,
    COUNT(county_id) AS num_of_high_risk_counties
FROM
(
    SELECT
        rs.record_date,
        rs.county_id,
        c.state_id,
        ROUND(((rs.sum_daily_positive_cases * c.population) / 100000), 2) AS transmission_risk
    FROM
    (
        SELECT
            f1.record_date,
            f1.daily_positive_cases,
            (
                SELECT SUM(daily_positive_cases)
                FROM Filtered f2
                WHERE
                    f2.county_id = f1.county_id AND
                    (f2.record_date BETWEEN f1.record_date - 6 AND f1.record_date)
            ) AS sum_daily_positive_cases,
            f1.county_id
        FROM Filtered f1
    ) rs
    INNER JOIN "N.SAOJI".County c
    ON rs.county_id = c.id
)
WHERE
    transmission_risk >= 100 AND
    (record_date BETWEEN '01-Jan-2020' AND '01-Jan-2022')
GROUP BY record_date, state_id;


-- US vaccination query
WITH Filtered(record_date, daily_first_doses, daily_fully_vaccinated, state_id) AS
(
    SELECT
        record_date,
        daily_first_doses,
        daily_fully_vaccinated,
        state_id
    FROM Vaccination_data
    WHERE state_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
)
SELECT
    TO_CHAR(t1.record_date, 'YYYY-MM-DD'),
    t1.cumulative_first_doses,
    ((t1.cumulative_first_doses / t2.state_population) * 100) AS cumulative_first_doses_percentage,
    t1.cumulative_fully_vaccinated,
    ((t1.cumulative_fully_vaccinated / t2.state_population) * 100) AS cumulative_fully_vaccinated_percentage,
    t2.state_id,
    t2.state_name
FROM
(
    SELECT
        record_date,
        daily_first_doses,
        SUM (daily_first_doses) OVER (PARTITION BY state_id ORDER BY record_date) AS cumulative_first_doses,
        daily_fully_vaccinated,
        SUM (daily_fully_vaccinated) OVER (PARTITION BY state_id ORDER BY record_date) AS cumulative_fully_vaccinated,
        state_id
    FROM Filtered
) t1 INNER JOIN
(
    SELECT
        State.id AS state_id,
        State.name AS state_name,
        SUM(County.population) AS state_population
    FROM County
    INNER JOIN State
    ON County.state_id = State.id
    GROUP BY State.id, State.name
) t2
ON t1.state_id = t2.state_id
WHERE (record_date BETWEEN '01-Jan-2019' AND '01-Jan-2022');


-- World vaccination query
WITH Filtered(record_date, daily_vaccinations, country_id) AS
(
    SELECT
        record_date,
        daily_vaccinations,
        country_id
    FROM "N.SAOJI".Country_covid_data
    WHERE country_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
)
SELECT
    record_date,
    cumulative_vaccinations,
    ((cumulative_vaccinations / population) * 100) AS cumulative_vaccinations_percentage,
    population,
    c.id AS country_id,
    c.name AS country_name
FROM
(
    SELECT
        record_date,
        daily_vaccinations,
        NVL(SUM(daily_vaccinations) OVER(PARTITION BY country_id ORDER BY record_date), 0) AS cumulative_vaccinations,
        country_id
    FROM Filtered
) t1 INNER JOIN "N.SAOJI".Country c
ON t1.country_id = c.id
WHERE (record_date BETWEEN '01-Jan-2020' AND '01-Jan-2022');

--Bed VS Death Comparision
SELECT fsid AS "State ID", fsn AS "State Name", tab AS "Total Beds", cbo AS "Covid ICU Bed Occupancy", tpc AS "Total Positive Cases", td AS "Total Deaths", dt AS "Date"
FROM 
(
    WITH bedinfo (sid, rd, tb, coib) AS
    (
        SELECT hd.STATE_ID, hd.RECORD_DATE, SUM(hd.TOTAL_BEDS), SUM(hd.COVID_OCCUPIED_ICU_BEDS) FROM "N.SAOJI".HOSPITALIZATION_DATA hd, "N.SAOJI".STATE s 
        WHERE hd.STATE_ID = s.ID
        GROUP BY hd.STATE_ID, hd.RECORD_DATE
    ),
    deathinfo (sid2, rd2, dpc, dd) AS
    (
        SELECT s.ID, ccd.RECORD_DATE, SUM(ccd.DAILY_POSITIVE_CASES), SUM(ccd.DAILY_DEATHS) FROM "N.SAOJI".STATE s, "N.SAOJI".COUNTY c , "N.SAOJI".COUNTY_COVID_DATA ccd 
        WHERE s.ID = c.STATE_ID AND c.ID = ccd.COUNTY_ID
        GROUP BY s.ID , ccd.RECORD_DATE 
    )
    SELECT s2.ID AS fsid, s2.NAME AS fsn, bi.tb AS tab, bi.coib AS cbo, di.dpc AS tpc, di.dd AS td, bi.rd AS dt
    FROM "N.SAOJI".STATE s2, bedinfo bi, deathinfo di
    WHERE s2.ID = bi.sid AND bi.sid = di.sid2 AND bi.rd = di.rd2
)
WHERE dt BETWEEN '15-MAR-21' AND '22-MAR-21' AND fsn IN ('California', 'Florida')
ORDER BY fsn ASC, dt ASC;

--Overall Record Count of the DB
SELECT t1.cryc+t2.ccdcryc+t3.couc+t4.ccdcouc+t5.hc+t7.vc+t6.sc AS TotalCount FROM 
    (SELECT COUNT(*) AS cryc FROM "N.SAOJI".COUNTRY c) t1, 
    (SELECT COUNT(*) AS ccdcryc FROM "N.SAOJI".COUNTRY_COVID_DATA ccd) t2,
    (SELECT COUNT(*) AS couc FROM "N.SAOJI".COUNTY c2) t3,
    (SELECT COUNT(*) AS ccdcouc FROM "N.SAOJI".COUNTY_COVID_DATA ccd2) t4,
    (SELECT COUNT(*) AS hc FROM "N.SAOJI".HOSPITALIZATION_DATA hd) t5,
    (SELECT COUNT(*) AS sc FROM "N.SAOJI".STATE s) t6,
    (SELECT COUNT(*) AS vc FROM "N.SAOJI".VACCINATION_DATA vd) t7;

--Total positive Cases and deaths their percentage per million for US
SELECT ftpc AS "Total Positive Cases", (ftpc/ftp)*1000000 AS "Percentage of Positive Cases per million people", ftd AS "Total Deaths", (ftd/ftp)*1000000 AS "Percentage of deaths per million people"
FROM 
(
    SELECT SUM(ts) AS ftpc, SUM(td) AS ftd, SUM(tp) AS ftp FROM 
    (
        SELECT s.ID, SUM(ccd.DAILY_POSITIVE_CASES) AS ts, SUM(ccd.DAILY_DEATHS) AS td, SUM(c.POPULATION) AS tp
        FROM "N.SAOJI".COUNTY_COVID_DATA ccd, "N.SAOJI".COUNTY c, "N.SAOJI".STATE s 
        WHERE ccd.COUNTY_ID = c.ID AND c.STATE_ID = s.ID 
        GROUP BY s.ID
    )
)

--Total positive Cases and deaths their percentage per million for the World
SELECT ftpc AS "Total Positive Cases", (ftpc/ftp)*1000000 AS "Percentage of Positive Cases per million people", ftd AS "Total Deaths", (ftd/ftp)*1000000 AS "Percentage of deaths per million people"
FROM 
(
    SELECT SUM(ts) AS ftpc, SUM(td) AS ftd, SUM(tp) AS ftp FROM 
    (
        SELECT c2.ID, SUM(ccd.DAILY_POSITIVE_CASES) AS ts, SUM(ccd.DAILY_DEATHS) AS td, SUM(c2.POPULATION) AS tp
        FROM "N.SAOJI".COUNTRY c2 , "N.SAOJI".COUNTRY_COVID_DATA ccd 
        WHERE c2.ID = ccd.COUNTRY_ID 
        GROUP BY c2.ID
    )
)

--Total Vaccinations in the world
SELECT ftv AS "Total Vaccinations", (ftv/ftp)*1000 AS "Percentage of Vaccinations per thousand people"
FROM 
(
    SELECT SUM(tv) AS ftv, SUM(tp) AS ftp FROM 
    (
        SELECT c2.ID, SUM(ccd.DAILY_VACCINATIONS) AS tv, SUM(c2.POPULATION) AS tp
        FROM "N.SAOJI".COUNTRY c2 , "N.SAOJI".COUNTRY_COVID_DATA ccd 
        WHERE c2.ID = ccd.COUNTRY_ID 
        GROUP BY c2.ID
    )
)

--Total Vaccinations in the US
SELECT fdfd AS "Total First Doses", (fdfd/ftp)*1000 AS "Percentage of first dose Vaccinations per thousand",
fdfc AS "Total fully vaccinated", (fdfc/ftp)*1000 AS "Percentage of complete Vaccinations per thousand",
f12 AS "12+ group Vaccinations", (f12/ftp)*1000 AS "Percentage of 12+ age group Vaccinations per thousand",
f18 AS "18+ group Vaccinations", (f18/ftp)*1000 AS "Percentage of 18+ age group Vaccinations per thousand",
f65 AS "65+ group Vaccinations", (f65/ftp)*1000 AS "Percentage of 65+ age group Vaccinations per thousand" 
FROM 
(
    SELECT SUM(dfd) AS fdfd, SUM(dfc) AS fdfc, SUM(dfc12) AS f12, SUM(dfc18) AS f18, SUM(dfc65) AS f65, SUM(tp) AS ftp FROM 
    (
        SELECT s.ID, SUM(vd.DAILY_FIRST_DOSES) AS dfd, SUM(vd.DAILY_FULLY_VACCINATED) AS dfc, SUM(vd.DAILY_FULLY_VACCINATED_12PLUS) AS dfc12, 
        SUM(vd.DAILY_FULLY_VACCINATED_18PLUS) AS dfc18, SUM(vd.DAILY_FULLY_VACCINATED_65PLUS) AS dfc65, SUM(c.POPULATION) AS tp
        FROM "N.SAOJI".STATE s , "N.SAOJI".VACCINATION_DATA vd, "N.SAOJI".COUNTY c 
        WHERE s.ID = vd.STATE_ID AND s.ID = c.STATE_ID 
        GROUP BY s.ID
    )
)

--Total Hospitilization in the US
SELECT ftb AS "Total Number of Beds", (ftb/ftp)*1000 AS "Percentage of beds per thousand",
fib AS "Total Covid Beds", (fib/ftp)*1000 AS "Percentage of covid beds per thousand",
fcb AS "Total Covid ICU Beds", (fcb/ftp)*1000 AS "Percentage of covid icu beds per thousand" 
FROM 
(
    SELECT SUM(tb) AS ftb, SUM(ticb) AS fib, SUM(tcicb) AS fcb, SUM(tp) AS ftp FROM 
    (
        SELECT s.ID, SUM(hd.TOTAL_BEDS) AS tb, SUM(hd.ICU_BEDS) AS ticb, SUM(hd.COVID_OCCUPIED_ICU_BEDS) AS tcicb, SUM(c.POPULATION) AS tp
        FROM "N.SAOJI".STATE s , "N.SAOJI".HOSPITALIZATION_DATA hd , "N.SAOJI".COUNTY c 
        WHERE s.ID = hd.STATE_ID AND s.ID = c.STATE_ID 
        GROUP BY s.ID
    )
)