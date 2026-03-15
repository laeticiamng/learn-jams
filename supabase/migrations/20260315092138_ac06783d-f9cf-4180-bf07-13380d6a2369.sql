
-- memory_architectures (M3 output)
CREATE TABLE IF NOT EXISTS public.memory_architectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.source_documents(id) ON DELETE CASCADE,
  course_profile_id uuid REFERENCES public.course_profiles(id) ON DELETE CASCADE,
  segments_json jsonb DEFAULT '[]'::jsonb,
  concept_order_json jsonb DEFAULT '[]'::jsonb,
  repetition_plan_json jsonb DEFAULT '{}'::jsonb,
  mnemonics_json jsonb DEFAULT '[]'::jsonb,
  visual_anchors_json jsonb DEFAULT '[]'::jsonb,
  cognitive_budget_json jsonb DEFAULT '{}'::jsonb,
  pedagogical_contract_json jsonb DEFAULT '{}'::jsonb,
  total_duration_sec integer DEFAULT 0,
  needs_splitting boolean DEFAULT false,
  split_modules_json jsonb DEFAULT '[]'::jsonb,
  reasoning_type text DEFAULT 'declaratif',
  objective text DEFAULT 'discovery',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.memory_architectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_via_doc" ON public.memory_architectures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.source_documents sd WHERE sd.id = document_id AND sd.user_id = auth.uid()));
CREATE POLICY "ma_insert" ON public.memory_architectures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.source_documents sd WHERE sd.id = document_id AND sd.user_id = auth.uid()));

-- format_decisions (M4 output)
CREATE TABLE IF NOT EXISTS public.format_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  architecture_id uuid REFERENCES public.memory_architectures(id) ON DELETE CASCADE,
  chosen_format text DEFAULT 'fiche_dynamique',
  justification text DEFAULT '',
  matrix_reasoning text DEFAULT '',
  estimated_duration_sec integer DEFAULT 0,
  needs_split boolean DEFAULT false,
  split_count integer,
  modules_json jsonb DEFAULT '[]'::jsonb,
  overrides_applied_json jsonb DEFAULT '[]'::jsonb,
  cost_level text DEFAULT 'low',
  decision_trace_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.format_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fd_via_arch" ON public.format_decisions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.memory_architectures ma
    JOIN public.source_documents sd ON sd.id = ma.document_id
    WHERE ma.id = architecture_id AND sd.user_id = auth.uid()
  ));
CREATE POLICY "fd_insert" ON public.format_decisions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.memory_architectures ma
    JOIN public.source_documents sd ON sd.id = ma.document_id
    WHERE ma.id = architecture_id AND sd.user_id = auth.uid()
  ));
