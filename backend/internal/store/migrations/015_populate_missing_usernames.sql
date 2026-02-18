-- Populate usernames for devices that have NULL or empty usernames
DO $$
DECLARE
    device_record RECORD;
    new_username TEXT;
    attempt INT;
    max_attempts INT := 20;
BEGIN
    -- Loop through all devices with NULL or empty usernames
    FOR device_record IN 
        SELECT device_public_id, anon_id, username 
        FROM devices 
        WHERE username IS NULL OR username = ''
    LOOP
        attempt := 0;
        -- Try to generate a unique username
        LOOP
            -- Generate a deterministic but unique 5-digit number from anon_id and attempt
            new_username := 'ghost_' || 
                LPAD(((('x' || SUBSTRING(MD5(device_record.anon_id || attempt::text), 1, 8))::bit(32)::bigint % 90000) + 10000)::text, 5, '0');
            
            -- Try to update if username is available
            BEGIN
                UPDATE devices 
                SET username = new_username 
                WHERE device_public_id = device_record.device_public_id;
                
                EXIT; -- Success, exit the loop
            EXCEPTION
                WHEN unique_violation THEN
                    attempt := attempt + 1;
                    IF attempt >= max_attempts THEN
                        RAISE EXCEPTION 'Could not generate unique username for device %', device_record.device_public_id;
                    END IF;
            END;
        END LOOP;
    END LOOP;
END $$;
