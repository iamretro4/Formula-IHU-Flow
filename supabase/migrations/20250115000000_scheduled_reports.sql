-- Create scheduled_reports table
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL, -- 'tasks', 'documents', 'projects', 'combined'
    frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    day_of_week INTEGER, -- 0-6 for weekly (0 = Sunday)
    day_of_month INTEGER, -- 1-31 for monthly
    time_of_day TIME NOT NULL DEFAULT '09:00:00',
    email_recipients TEXT[] NOT NULL,
    report_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scheduled reports" ON public.scheduled_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled reports" ON public.scheduled_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled reports" ON public.scheduled_reports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled reports" ON public.scheduled_reports
    FOR DELETE USING (auth.uid() = user_id);

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run_time(
    p_frequency TEXT,
    p_day_of_week INTEGER,
    p_day_of_month INTEGER,
    p_time_of_day TIME,
    p_last_run_at TIMESTAMPTZ DEFAULT NULL
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_next_run TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_today_date DATE := CURRENT_DATE;
    v_target_time TIMESTAMPTZ;
BEGIN
    -- Combine today's date with the target time
    v_target_time := (v_today_date + p_time_of_day)::TIMESTAMPTZ;
    
    IF p_frequency = 'daily' THEN
        -- If target time today has passed, schedule for tomorrow
        IF v_target_time <= v_now THEN
            v_next_run := (v_today_date + INTERVAL '1 day' + p_time_of_day)::TIMESTAMPTZ;
        ELSE
            v_next_run := v_target_time;
        END IF;
        
    ELSIF p_frequency = 'weekly' THEN
        -- Find next occurrence of the specified day of week
        v_next_run := v_target_time;
        WHILE EXTRACT(DOW FROM v_next_run) != p_day_of_week OR v_next_run <= v_now LOOP
            v_next_run := v_next_run + INTERVAL '1 day';
        END LOOP;
        
    ELSIF p_frequency = 'monthly' THEN
        -- Find next occurrence of the specified day of month
        v_next_run := v_target_time;
        WHILE EXTRACT(DAY FROM v_next_run) != p_day_of_month OR v_next_run <= v_now LOOP
            v_next_run := v_next_run + INTERVAL '1 day';
            -- If we've gone past the end of the month, move to next month
            IF EXTRACT(DAY FROM v_next_run) != p_day_of_month AND EXTRACT(DAY FROM v_next_run) = 1 THEN
                -- Move to the target day of next month
                v_next_run := (DATE_TRUNC('month', v_next_run) + INTERVAL '1 month' + (p_day_of_month - 1 || ' days')::INTERVAL + p_time_of_day)::TIMESTAMPTZ;
            END IF;
        END LOOP;
    END IF;
    
    RETURN v_next_run;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update next_run_at
CREATE OR REPLACE FUNCTION update_scheduled_report_next_run()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active THEN
        NEW.next_run_at := calculate_next_run_time(
            NEW.frequency,
            NEW.day_of_week,
            NEW.day_of_month,
            NEW.time_of_day,
            NEW.last_run_at
        );
    ELSE
        NEW.next_run_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_next_run_on_scheduled_report
    BEFORE INSERT OR UPDATE ON public.scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_report_next_run();

