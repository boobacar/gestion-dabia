-- Migration to fix existing patient phone numbers to include +221
-- Targets numbers that are exactly 9 digits or start with 77, 78, 76, 70 and are 9 digits long

UPDATE patients
SET phone_number = '+221' || phone_number
WHERE phone_number IS NOT NULL
  AND phone_number !~ '^\+' -- Doesn't start with +
  AND length(regexp_replace(phone_number, '[^\d]', '', 'g')) = 9; -- Has exactly 9 digits
