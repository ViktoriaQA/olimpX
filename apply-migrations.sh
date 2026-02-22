#!/bin/bash

# Apply database migrations
echo "Applying database migrations..."

# Apply the new student/trainer roles migration
echo "Adding student and trainer roles to database..."
psql "$DATABASE_URL" -f ./backend/supabase/migrations/20260222_add_student_trainer_roles.sql

echo "Migration completed successfully!"
