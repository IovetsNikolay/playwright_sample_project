import { faker } from '@faker-js/faker';

export interface RegistrationDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;  // YYYY-MM-DD
  country: string;
  postalCode: string;
  houseNumber: string;
  street: string;
  city: string;
  state: string;
  phone: string;        // digits only
  email: string;
  password: string;
}

const SUPPORTED_COUNTRIES = [
  'United States of America (the)', 'United Kingdom', 'Germany', 'France',
  'Netherlands (the)', 'Belgium', 'Canada', 'Australia',
];

export function generateRegistrationData(): RegistrationDto {
  return {
    firstName:   faker.person.firstName(),
    lastName:    faker.person.lastName(),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0],
    country:     faker.helpers.arrayElement(SUPPORTED_COUNTRIES),
    postalCode:  faker.location.zipCode(),
    houseNumber: faker.number.int({ min: 1, max: 999 }).toString(),
    street:      faker.location.street(),
    city:        faker.location.city(),
    state:       faker.location.state(),
    phone:       faker.string.numeric(10),
    email:       faker.internet.email(),
    password:    generateValidPassword(),
  };
}

function generateValidPassword(): string {
  const upper   = faker.string.alpha({ length: 2, casing: 'upper' });
  const lower   = faker.string.alpha({ length: 2, casing: 'lower' });
  const digits  = faker.number.int({ min: 10, max: 99 }).toString();
  const special = faker.helpers.arrayElement(['@', '#', '$', '!', '%', '&']);
  const extra   = faker.string.alphanumeric({ length: 4 });
  return faker.helpers.shuffle([upper, lower, digits, special, extra].join('').split('')).join('');
}
