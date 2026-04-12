-- Seed data: 18 mock users across 3 departments
-- Source: frontend/src/mocks/users.ts

-- Engineers
INSERT INTO users (id, name, department) VALUES ('user-tanaka', 'H. Tanaka', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-rossi', 'L. Rossi', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-garcia', 'R. Garcia', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-chen', 'M. Chen', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-patel', 'S. Patel', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-kim', 'A. Kim', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-muller', 'K. Müller', 'Facilities');
INSERT INTO users (id, name, department) VALUES ('user-smith', 'J. Smith', 'Facilities');

-- L5 managers (one per department)
INSERT INTO users (id, name, department) VALUES ('user-yamamoto', 'T. Yamamoto', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-lee', 'D. Lee', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-hoffman', 'B. Hoffman', 'Facilities');

-- L4 managers (one per department)
INSERT INTO users (id, name, department) VALUES ('user-nakamura', 'Y. Nakamura', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-wang', 'F. Wang', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-anderson', 'P. Anderson', 'Facilities');

-- PI engineers (one per department)
INSERT INTO users (id, name, department) VALUES ('user-sato', 'N. Sato', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-kumar', 'V. Kumar', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-fischer', 'E. Fischer', 'Facilities');

-- Additional engineers
INSERT INTO users (id, name, department) VALUES ('user-park', 'C. Park', 'Etch');
