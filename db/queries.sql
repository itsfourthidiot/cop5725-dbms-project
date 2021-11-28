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
    FROM Country_covid_data
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
    FROM Country_covid_data
    WHERE country_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
)
SELECT
    record_date,
    cumulative_vaccinations,
    ((cumulative_vaccinations / population) * 100) AS cumulative_vaccinations_percentage,
    population,
    Country.id AS country_id,
    Country.name AS country_name
FROM
(
    SELECT
        record_date,
        daily_vaccinations,
        NVL(SUM(daily_vaccinations) OVER(PARTITION BY country_id ORDER BY record_date), 0) AS cumulative_vaccinations,
        country_id
    FROM Filtered
) t1 INNER JOIN Country
ON t1.country_id = Country.id
WHERE (record_date BETWEEN '01-Jan-2020' AND '01-Jan-2022');