#!/bin/bash

# Apply Supabase migrations script
echo "🔄 Applying Supabase migrations..."

# Check if SUPABASE_URL and SUPABASE_SERVICE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set"
    echo "Please set them in your .env file:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_SERVICE_KEY=your_supabase_service_key"
    exit 1
fi

# Get directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/supabase/migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Error: Migrations directory not found at $MIGRATIONS_DIR"
    exit 1
fi

# Apply each migration file in order
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        echo "📝 Applying migration: $(basename "$migration_file")"
        
        # Execute migration using curl to Supabase REST API
        response=$(curl -s -X POST \
            "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
            -H "apikey: $SUPABASE_SERVICE_KEY" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"sql\": $(cat "$migration_file" | jq -Rs .)}")
        
        # Check if migration was successful
        if echo "$response" | jq -e 'has("error")' > /dev/null; then
            echo "❌ Error applying migration $(basename "$migration_file"):"
            echo "$response" | jq -r '.error'
            exit 1
        else
            echo "✅ Migration $(basename "$migration_file") applied successfully"
        fi
    fi
done

echo "🎉 All migrations applied successfully!"
