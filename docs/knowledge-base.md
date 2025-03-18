# Knowledge Base

## Supabase Authentication and RLS

### Authentication Issues

- **Problem**: 401 Unauthorized errors when performing write operations (insert, update, delete) with Row Level Security (RLS) enabled.
- **Solution**: Use the standard `supabase` client instead of `supabaseAdmin` for authenticated user operations.

### Client Configuration

```typescript
// Standard client for authenticated users
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Admin client with service role permissions - use only in secure contexts
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
```

### Best Practices

1. **For authenticated user operations**:
   - Use the standard `supabase` client which includes the user's JWT token
   - Example: `supabase.from("locations").insert([{ name, lat, lng }])`

2. **For admin operations** (server-side only):
   - Use `supabaseAdmin` only in secure contexts (Edge functions, server-side code)
   - Never expose the service role key to client-side code

3. **RLS Policies**:
   - Ensure proper RLS policies are in place for each table
   - Test policies thoroughly with authenticated and anonymous users

### Common Errors

- **"Invalid API key"**: Often occurs when using `supabaseAdmin` in client-side code
- **401 Unauthorized**: Check if RLS policies are correctly configured for the authenticated user

## Google Maps Integration

### Map Initialization

- Ensure the Google Maps API is properly loaded before initializing maps
- Handle potential race conditions with proper state management
- Use a unique callback name when loading the API to avoid conflicts

```javascript
const callbackName = "initGoogleMapsAPI_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
window[callbackName] = () => {
  setMapLoaded(true);
  // Clean up the callback after it's used
  setTimeout(() => {
    delete window[callbackName];
  }, 1000);
};
```

## Database Schema

### Tables

- **locations**: Stores location data with name, latitude, and longitude
- **settings**: Stores application settings like default map location

### RLS Policies

Ensure the following RLS policies are in place:

```sql
-- Example policies for locations table
CREATE POLICY "Enable read access for authenticated users" ON locations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON locations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON locations
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON locations
  FOR DELETE USING (auth.role() = 'authenticated');
```

---

*This knowledge base will be updated as we learn more about the system.*
