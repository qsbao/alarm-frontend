-- Seed data: 27 mock users across 3 departments
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

-- Additional engineers (batch 2) — 9 more to reach 27
INSERT INTO users (id, name, department) VALUES ('user-oconnor', 'M. O''Connor', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-silva', 'A. Silva', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-ito', 'K. Ito', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-johnson', 'T. Johnson', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-martinez', 'R. Martinez', 'Facilities');
INSERT INTO users (id, name, department) VALUES ('user-brown', 'D. Brown', 'Facilities');
INSERT INTO users (id, name, department) VALUES ('user-watanabe', 'S. Watanabe', 'Litho');
INSERT INTO users (id, name, department) VALUES ('user-zhang', 'L. Zhang', 'Etch');
INSERT INTO users (id, name, department) VALUES ('user-taylor', 'J. Taylor', 'Facilities');
