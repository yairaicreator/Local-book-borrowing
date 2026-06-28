import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://opojabexgmccmaxscmxt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wb2phYmV4Z21jY21heHNjbXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDE0NDMsImV4cCI6MjA5ODIxNzQ0M30.P3xSavpDIjPSCaWMYcMNCzQztqSllkYLAuNvgHwOlkw'
)
