export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adaptive_credit_balances: {
        Row: {
          id: string
          user_id: string
          billing_period_start: string
          billing_period_end: string
          available_flex_credits_json: Json
          consumed_flex_credits_json: Json
          reallocation_log_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          billing_period_start: string
          billing_period_end: string
          available_flex_credits_json?: Json
          consumed_flex_credits_json?: Json
          reallocation_log_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          billing_period_start?: string
          billing_period_end?: string
          available_flex_credits_json?: Json
          consumed_flex_credits_json?: Json
          reallocation_log_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      adaptive_credit_policies: {
        Row: {
          id: string
          policy_key: string
          plan_key: string
          conversion_rules_json: Json
          monthly_flex_budget_json: Json
          caps_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          policy_key: string
          plan_key: string
          conversion_rules_json?: Json
          monthly_flex_budget_json?: Json
          caps_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          policy_key?: string
          plan_key?: string
          conversion_rules_json?: Json
          monthly_flex_budget_json?: Json
          caps_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collaborative_sessions: {
        Row: {
          created_at: string
          creator_id: string
          final_song_id: string | null
          id: string
          invite_code: string
          max_participants: number
          status: string
          style: string
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          final_song_id?: string | null
          id?: string
          invite_code?: string
          max_participants?: number
          status?: string
          style?: string
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          final_song_id?: string | null
          id?: string
          invite_code?: string
          max_participants?: number
          status?: string
          style?: string
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_sessions_final_song_id_fkey"
            columns: ["final_song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          id: string
          course_profile_id: string
          stable_key: string
          label: string
          definition: string
          criticality: number
          bloom_target: string
          category: string
          prerequisites_json: Json
          source_confidence: number
          source_trace_json: Json
          concept_type: string | null
          criticality_score: number | null
          relations_json: Json
          uncertain: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          course_profile_id: string
          stable_key: string
          label: string
          definition?: string
          criticality?: number
          bloom_target?: string
          category?: string
          prerequisites_json?: Json
          source_confidence?: number
          source_trace_json?: Json
          concept_type?: string | null
          criticality_score?: number | null
          relations_json?: Json
          uncertain?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          course_profile_id?: string
          stable_key?: string
          label?: string
          definition?: string
          criticality?: number
          bloom_target?: string
          category?: string
          prerequisites_json?: Json
          source_confidence?: number
          source_trace_json?: Json
          concept_type?: string | null
          criticality_score?: number | null
          relations_json?: Json
          uncertain?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      confusion_pairs: {
        Row: {
          id: string
          course_profile_id: string
          concept_a_id: string
          concept_b_id: string
          distinction_key: string
          frequency: number
          created_at: string
        }
        Insert: {
          id?: string
          course_profile_id: string
          concept_a_id: string
          concept_b_id: string
          distinction_key?: string
          frequency?: number
          created_at?: string
        }
        Update: {
          id?: string
          course_profile_id?: string
          concept_a_id?: string
          concept_b_id?: string
          distinction_key?: string
          frequency?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "confusion_pairs_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confusion_pairs_concept_a_id_fkey"
            columns: ["concept_a_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confusion_pairs_concept_b_id_fkey"
            columns: ["concept_b_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_events: {
        Row: {
          id: string
          user_id: string
          guardian_id: string | null
          event_type: string
          metadata_json: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          guardian_id?: string | null
          event_type: string
          metadata_json?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          guardian_id?: string | null
          event_type?: string
          metadata_json?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_events_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      cost_events: {
        Row: {
          id: string
          user_id: string | null
          transformation_id: string | null
          feature_key: string
          provider_key: string
          estimated_cost_usd: number | null
          actual_cost_usd: number | null
          metadata_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          transformation_id?: string | null
          feature_key: string
          provider_key: string
          estimated_cost_usd?: number | null
          actual_cost_usd?: number | null
          metadata_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          transformation_id?: string | null
          feature_key?: string
          provider_key?: string
          estimated_cost_usd?: number | null
          actual_cost_usd?: number | null
          metadata_json?: Json
          created_at?: string
        }
        Relationships: []
      }
      course_profiles: {
        Row: {
          id: string
          document_id: string
          main_topic: string
          learning_objectives_json: Json
          reasoning_type: string
          density: number
          recommended_template: string
          concepts_confidence: number
          logic_confidence: number
          traps_confidence: number
          structure_confidence: number
          ambiguous_zones_json: Json
          prerequis_json: Json
          traps_json: Json
          source_issues_json: Json
          total_concepts: number | null
          critical_count: number | null
          estimated_complexity: number | null
          document_difficulty_level: string | null
          estimated_audience_level: string | null
          audience_mismatch_risk: number | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          main_topic?: string
          learning_objectives_json?: Json
          reasoning_type?: string
          density?: number
          recommended_template?: string
          concepts_confidence?: number
          logic_confidence?: number
          traps_confidence?: number
          structure_confidence?: number
          ambiguous_zones_json?: Json
          prerequis_json?: Json
          traps_json?: Json
          source_issues_json?: Json
          total_concepts?: number | null
          critical_count?: number | null
          estimated_complexity?: number | null
          document_difficulty_level?: string | null
          estimated_audience_level?: string | null
          audience_mismatch_risk?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          main_topic?: string
          learning_objectives_json?: Json
          reasoning_type?: string
          density?: number
          recommended_template?: string
          concepts_confidence?: number
          logic_confidence?: number
          traps_confidence?: number
          structure_confidence?: number
          ambiguous_zones_json?: Json
          prerequis_json?: Json
          traps_json?: Json
          source_issues_json?: Json
          total_concepts?: number | null
          critical_count?: number | null
          estimated_complexity?: number | null
          document_difficulty_level?: string | null
          estimated_audience_level?: string | null
          audience_mismatch_risk?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_profiles_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          id: string
          pack_key: string
          label: string
          price: number
          currency: string
          credits_json: Json
          stripe_price_id: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pack_key: string
          label: string
          price: number
          currency?: string
          credits_json?: Json
          stripe_price_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pack_key?: string
          label?: string
          price?: number
          currency?: string
          credits_json?: Json
          stripe_price_id?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      debrief_reports: {
        Row: {
          id: string
          user_id: string
          transformation_id: string
          recall_attempt_id: string
          report_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transformation_id: string
          recall_attempt_id: string
          report_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transformation_id?: string
          recall_attempt_id?: string
          report_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debrief_reports_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "transformations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debrief_reports_recall_attempt_id_fkey"
            columns: ["recall_attempt_id"]
            isOneToOne: false
            referencedRelation: "recall_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_segments: {
        Row: {
          id: string
          document_id: string
          segment_index: number
          title: string | null
          content: string
          hierarchy_level: number
          confidence_score: number
          page_ref: number | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          segment_index?: number
          title?: string | null
          content?: string
          hierarchy_level?: number
          confidence_score?: number
          page_ref?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          segment_index?: number
          title?: string | null
          content?: string
          hierarchy_level?: number
          confidence_score?: number
          page_ref?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_segments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      education_profiles: {
        Row: {
          id: string
          user_id: string
          education_stage: string
          institution_type: string | null
          field_category: string | null
          field_of_study: string | null
          year_in_program: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          education_stage?: string
          institution_type?: string | null
          field_category?: string | null
          field_of_study?: string | null
          year_in_program?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          education_stage?: string
          institution_type?: string | null
          field_category?: string | null
          field_of_study?: string | null
          year_in_program?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      experiment_assignments: {
        Row: {
          id: string
          user_id: string | null
          anonymous_id: string | null
          experiment_key: string
          variant: string
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          anonymous_id?: string | null
          experiment_key: string
          variant: string
          assigned_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          anonymous_id?: string | null
          experiment_key?: string
          variant?: string
          assigned_at?: string
        }
        Relationships: []
      }
      experiment_measurements: {
        Row: {
          id: string
          experiment_run_id: string
          measure_key: string
          measure_value_numeric: number | null
          measure_value_text: string | null
          recorded_at: string
        }
        Insert: {
          id?: string
          experiment_run_id: string
          measure_key: string
          measure_value_numeric?: number | null
          measure_value_text?: string | null
          recorded_at?: string
        }
        Update: {
          id?: string
          experiment_run_id?: string
          measure_key?: string
          measure_value_numeric?: number | null
          measure_value_text?: string | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_measurements_experiment_run_id_fkey"
            columns: ["experiment_run_id"]
            isOneToOne: false
            referencedRelation: "experiment_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_runs: {
        Row: {
          id: string
          assignment_id: string
          transformation_id: string | null
          status: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          assignment_id: string
          transformation_id?: string | null
          status?: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          assignment_id?: string
          transformation_id?: string | null
          status?: string
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experiment_runs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "experiment_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          id: string
          flag_key: string
          enabled: boolean
          rules_json: Json
          updated_at: string
        }
        Insert: {
          id?: string
          flag_key: string
          enabled?: boolean
          rules_json?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          flag_key?: string
          enabled?: boolean
          rules_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      final_tests: {
        Row: {
          id: string
          transformation_id: string
          questions_json: Json
          bloom_levels_count: number
          question_count: number
          created_at: string
        }
        Insert: {
          id?: string
          transformation_id: string
          questions_json?: Json
          bloom_levels_count?: number
          question_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          transformation_id?: string
          questions_json?: Json
          bloom_levels_count?: number
          question_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_tests_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "transformations"
            referencedColumns: ["id"]
          },
        ]
      }
      format_decisions: {
        Row: {
          id: string
          architecture_id: string
          document_id: string
          course_profile_id: string
          user_id: string
          chosen_format: string
          justification: string
          matrix_reasoning: string
          estimated_duration_sec: number
          needs_split: boolean
          split_count: number | null
          modules_json: Json | null
          overrides_applied_json: Json
          cost_level: string
          decision_trace_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          architecture_id: string
          document_id: string
          course_profile_id: string
          user_id: string
          chosen_format?: string
          justification?: string
          matrix_reasoning?: string
          estimated_duration_sec?: number
          needs_split?: boolean
          split_count?: number | null
          modules_json?: Json | null
          overrides_applied_json?: Json
          cost_level?: string
          decision_trace_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          architecture_id?: string
          document_id?: string
          course_profile_id?: string
          user_id?: string
          chosen_format?: string
          justification?: string
          matrix_reasoning?: string
          estimated_duration_sec?: number
          needs_split?: boolean
          split_count?: number | null
          modules_json?: Json | null
          overrides_applied_json?: Json
          cost_level?: string
          decision_trace_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "format_decisions_architecture_id_fkey"
            columns: ["architecture_id"]
            isOneToOne: false
            referencedRelation: "memory_architectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "format_decisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "format_decisions_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      format_quality_reports: {
        Row: {
          id: string
          format: string
          generation_id: string
          overall_score: number
          publish_blocked: boolean
          checks_json: Json
          blocking_violations_json: Json
          warnings_json: Json
          suggestions_json: Json
          reviewed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          format: string
          generation_id: string
          overall_score?: number
          publish_blocked?: boolean
          checks_json?: Json
          blocking_violations_json?: Json
          warnings_json?: Json
          suggestions_json?: Json
          reviewed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          format?: string
          generation_id?: string
          overall_score?: number
          publish_blocked?: boolean
          checks_json?: Json
          blocking_violations_json?: Json
          warnings_json?: Json
          suggestions_json?: Json
          reviewed_at?: string
          created_at?: string
        }
        Relationships: []
      }
      generated_contents: {
        Row: {
          id: string
          transformation_id: string
          version: number
          content_json: Json
          source_disclaimer_json: Json
          coverage_json: Json
          generation_flags_json: Json
          internal_summary_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          transformation_id: string
          version?: number
          content_json?: Json
          source_disclaimer_json?: Json
          coverage_json?: Json
          generation_flags_json?: Json
          internal_summary_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          transformation_id?: string
          version?: number
          content_json?: Json
          source_disclaimer_json?: Json
          coverage_json?: Json
          generation_flags_json?: Json
          internal_summary_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_contents_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "transformations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_missions: {
        Row: {
          id: string
          user_id: string
          document_id: string
          course_profile_id: string
          generation_mode: string
          chosen_format: string
          narrative_template: string
          room_count: number
          includes_boss: boolean
          fallback_mode: string
          quality_band: string
          qa_score: number
          mission_json: Json
          published_status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          course_profile_id: string
          generation_mode?: string
          chosen_format?: string
          narrative_template?: string
          room_count?: number
          includes_boss?: boolean
          fallback_mode?: string
          quality_band?: string
          qa_score?: number
          mission_json?: Json
          published_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          course_profile_id?: string
          generation_mode?: string
          chosen_format?: string
          narrative_template?: string
          room_count?: number
          includes_boss?: boolean
          fallback_mode?: string
          quality_band?: string
          qa_score?: number
          mission_json?: Json
          published_status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_missions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_missions_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_artifacts: {
        Row: {
          id: string
          job_id: string
          artifact_type: string
          storage_path: string
          metadata_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          artifact_type: string
          storage_path: string
          metadata_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          artifact_type?: string
          storage_path?: string
          metadata_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_artifacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          id: string
          user_id: string | null
          domain: string
          job_type: string
          status: string
          preferred_provider_key: string | null
          actual_provider_key: string | null
          input_json: Json
          output_json: Json
          error_json: Json
          retry_count: number
          max_retries: number
          started_at: string | null
          finished_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          domain: string
          job_type: string
          status?: string
          preferred_provider_key?: string | null
          actual_provider_key?: string | null
          input_json?: Json
          output_json?: Json
          error_json?: Json
          retry_count?: number
          max_retries?: number
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          domain?: string
          job_type?: string
          status?: string
          preferred_provider_key?: string | null
          actual_provider_key?: string | null
          input_json?: Json
          output_json?: Json
          error_json?: Json
          retry_count?: number
          max_retries?: number
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      golden_dataset_runs: {
        Row: {
          id: string
          prompt_version_id: string
          dataset_name: string
          pass: boolean
          metrics_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          prompt_version_id: string
          dataset_name: string
          pass?: boolean
          metrics_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          prompt_version_id?: string
          dataset_name?: string
          pass?: boolean
          metrics_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "golden_dataset_runs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_notification_preferences: {
        Row: {
          id: string
          guardian_id: string
          weekly_summary_enabled: boolean
          alert_on_content_flag: boolean
          alert_on_usage_spike: boolean
          alert_on_new_subject: boolean
          preferred_channel: string
          preferred_locale: string
          quiet_hours_start: number | null
          quiet_hours_end: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          guardian_id: string
          weekly_summary_enabled?: boolean
          alert_on_content_flag?: boolean
          alert_on_usage_spike?: boolean
          alert_on_new_subject?: boolean
          preferred_channel?: string
          preferred_locale?: string
          quiet_hours_start?: number | null
          quiet_hours_end?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          guardian_id?: string
          weekly_summary_enabled?: boolean
          alert_on_content_flag?: boolean
          alert_on_usage_spike?: boolean
          alert_on_new_subject?: boolean
          preferred_channel?: string
          preferred_locale?: string
          quiet_hours_start?: number | null
          quiet_hours_end?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_notification_preferences_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: true
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_notifications: {
        Row: {
          id: string
          guardian_id: string
          user_id: string
          notification_type: string
          channel: string
          subject: string | null
          body_json: Json | null
          status: string
          sent_at: string | null
          delivered_at: string | null
          error_message: string | null
          language: string | null
          created_at: string
        }
        Insert: {
          id?: string
          guardian_id: string
          user_id: string
          notification_type: string
          channel?: string
          subject?: string | null
          body_json?: Json | null
          status?: string
          sent_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          language?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          guardian_id?: string
          user_id?: string
          notification_type?: string
          channel?: string
          subject?: string | null
          body_json?: Json | null
          status?: string
          sent_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          language?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_notifications_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          id: string
          email: string
          display_name: string | null
          phone: string | null
          auth_user_id: string | null
          verified_at: string | null
          invite_token: string | null
          invite_expires_at: string | null
          preferred_language: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          display_name?: string | null
          phone?: string | null
          auth_user_id?: string | null
          verified_at?: string | null
          invite_token?: string | null
          invite_expires_at?: string | null
          preferred_language?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          phone?: string | null
          auth_user_id?: string | null
          verified_at?: string | null
          invite_token?: string | null
          invite_expires_at?: string | null
          preferred_language?: string | null
          created_at?: string
        }
        Relationships: []
      }
      institution_contacts: {
        Row: {
          id: string
          institution_name: string
          contact_email: string
          contact_name: string | null
          contact_role: string | null
          country_code: string | null
          contract_type: string | null
          max_users: number | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_name: string
          contact_email: string
          contact_name?: string | null
          contact_role?: string | null
          country_code?: string | null
          contract_type?: string | null
          max_users?: number | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_name?: string
          contact_email?: string
          contact_name?: string | null
          contact_role?: string | null
          country_code?: string | null
          contract_type?: string | null
          max_users?: number | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      league_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          song_id: string | null
          user_id: string
          week: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          reason: string
          song_id?: string | null
          user_id: string
          week: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          song_id?: string | null
          user_id?: string
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_points_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_confusion_edges: {
        Row: {
          id: string
          user_id: string
          concept_a_key: string
          concept_b_key: string
          hits_count: number
          last_hit_at: string | null
          severity_score: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          concept_a_key: string
          concept_b_key: string
          hits_count?: number
          last_hit_at?: string | null
          severity_score?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          concept_a_key?: string
          concept_b_key?: string
          hits_count?: number
          last_hit_at?: string | null
          severity_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      learner_format_effectiveness: {
        Row: {
          id: string
          user_id: string
          format: string
          objective: string
          audience_level: string | null
          attempts_count: number
          avg_raw_score: number | null
          avg_composite_score: number | null
          avg_calibration_gap: number | null
          retention_signal: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          format: string
          objective: string
          audience_level?: string | null
          attempts_count?: number
          avg_raw_score?: number | null
          avg_composite_score?: number | null
          avg_calibration_gap?: number | null
          retention_signal?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          format?: string
          objective?: string
          audience_level?: string | null
          attempts_count?: number
          avg_raw_score?: number | null
          avg_composite_score?: number | null
          avg_calibration_gap?: number | null
          retention_signal?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      learner_knowledge_graph: {
        Row: {
          id: string
          user_id: string
          concept_stable_key: string
          mastery_score: number
          mastery_status: string
          last_seen_at: string
          next_review_at: string | null
          observations_count: number
          confusion_hits: number
          archived: boolean
          metadata_json: Json
          updated_at: string
          last_correct_at: string | null
          last_incorrect_at: string | null
          correct_count: number
          incorrect_count: number
          confidence_mean: number | null
          calibration_gap_mean: number | null
          format_efficacy_json: Json
        }
        Insert: {
          id?: string
          user_id: string
          concept_stable_key: string
          mastery_score?: number
          mastery_status?: string
          last_seen_at?: string
          next_review_at?: string | null
          observations_count?: number
          confusion_hits?: number
          archived?: boolean
          metadata_json?: Json
          updated_at?: string
          last_correct_at?: string | null
          last_incorrect_at?: string | null
          correct_count?: number
          incorrect_count?: number
          confidence_mean?: number | null
          calibration_gap_mean?: number | null
          format_efficacy_json?: Json
        }
        Update: {
          id?: string
          user_id?: string
          concept_stable_key?: string
          mastery_score?: number
          mastery_status?: string
          last_seen_at?: string
          next_review_at?: string | null
          observations_count?: number
          confusion_hits?: number
          archived?: boolean
          metadata_json?: Json
          updated_at?: string
          last_correct_at?: string | null
          last_incorrect_at?: string | null
          correct_count?: number
          incorrect_count?: number
          confidence_mean?: number | null
          calibration_gap_mean?: number | null
          format_efficacy_json?: Json
        }
        Relationships: []
      }
      learner_profiles: {
        Row: {
          id: string
          user_id: string
          profile_status: string
          level_declared: string | null
          cognitive_profile_json: Json
          session_count: number
          calibration_sessions_count: number
          age_band: string | null
          education_stage: string | null
          declared_level: string | null
          explanation_style: string | null
          preferred_density: string | null
          dominant_learning_pattern: string | null
          best_format: string | null
          guidance_need: string | null
          confidence_calibration_quality: string | null
          revision_consistency_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          profile_status?: string
          level_declared?: string | null
          cognitive_profile_json?: Json
          session_count?: number
          calibration_sessions_count?: number
          age_band?: string | null
          education_stage?: string | null
          declared_level?: string | null
          explanation_style?: string | null
          preferred_density?: string | null
          dominant_learning_pattern?: string | null
          best_format?: string | null
          guidance_need?: string | null
          confidence_calibration_quality?: string | null
          revision_consistency_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          profile_status?: string
          level_declared?: string | null
          cognitive_profile_json?: Json
          session_count?: number
          calibration_sessions_count?: number
          age_band?: string | null
          education_stage?: string | null
          declared_level?: string | null
          explanation_style?: string | null
          preferred_density?: string | null
          dominant_learning_pattern?: string | null
          best_format?: string | null
          guidance_need?: string | null
          confidence_calibration_quality?: string | null
          revision_consistency_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      learner_progress_snapshots: {
        Row: {
          id: string
          user_id: string
          snapshot_date: string
          concepts_known: number
          concepts_fragile: number
          concepts_aging: number
          avg_mastery_score: number | null
          avg_calibration_gap: number | null
          weekly_activity_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          snapshot_date: string
          concepts_known?: number
          concepts_fragile?: number
          concepts_aging?: number
          avg_mastery_score?: number | null
          avg_calibration_gap?: number | null
          weekly_activity_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          snapshot_date?: string
          concepts_known?: number
          concepts_fragile?: number
          concepts_aging?: number
          avg_mastery_score?: number | null
          avg_calibration_gap?: number | null
          weekly_activity_score?: number | null
          created_at?: string
        }
        Relationships: []
      }
      legacy_plan_migrations: {
        Row: {
          id: string
          user_id: string
          legacy_plan_id: string
          target_plan_key: string
          migrated_at: string | null
          rules_applied_json: Json
          compensation_granted: boolean
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          legacy_plan_id: string
          target_plan_key: string
          migrated_at?: string | null
          rules_applied_json?: Json
          compensation_granted?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          legacy_plan_id?: string
          target_plan_key?: string
          migrated_at?: string | null
          rules_applied_json?: Json
          compensation_granted?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lyrics_generations: {
        Row: {
          id: string
          song_id: string
          version: number
          learner_lyrics_profile_json: Json
          canonical_lyrics: string
          audio_safe_lyrics: string | null
          lyrics_metadata_text: string | null
          lyrics_metadata_json: Json | null
          audience_level: string | null
          vocabulary_level: string | null
          density_level: string | null
          generation_flags_json: Json | null
          sanitizer_report_json: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          song_id: string
          version?: number
          learner_lyrics_profile_json?: Json
          canonical_lyrics: string
          audio_safe_lyrics?: string | null
          lyrics_metadata_text?: string | null
          lyrics_metadata_json?: Json | null
          audience_level?: string | null
          vocabulary_level?: string | null
          density_level?: string | null
          generation_flags_json?: Json | null
          sanitizer_report_json?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          song_id?: string
          version?: number
          learner_lyrics_profile_json?: Json
          canonical_lyrics?: string
          audio_safe_lyrics?: string | null
          lyrics_metadata_text?: string | null
          lyrics_metadata_json?: Json | null
          audience_level?: string | null
          vocabulary_level?: string | null
          density_level?: string | null
          generation_flags_json?: Json | null
          sanitizer_report_json?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lyrics_generations_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      margin_reports: {
        Row: {
          id: string
          period_key: string
          plan_key: string
          revenue_total_usd: number
          provider_cost_total_usd: number
          gross_margin_usd: number
          gross_margin_pct: number
          created_at: string
        }
        Insert: {
          id?: string
          period_key: string
          plan_key: string
          revenue_total_usd?: number
          provider_cost_total_usd?: number
          gross_margin_usd?: number
          gross_margin_pct?: number
          created_at?: string
        }
        Update: {
          id?: string
          period_key?: string
          plan_key?: string
          revenue_total_usd?: number
          provider_cost_total_usd?: number
          gross_margin_usd?: number
          gross_margin_pct?: number
          created_at?: string
        }
        Relationships: []
      }
      memory_architectures: {
        Row: {
          id: string
          document_id: string
          course_profile_id: string
          user_id: string
          segments_json: Json
          concept_order_json: Json
          repetition_plan_json: Json
          mnemonics_json: Json
          visual_anchors_json: Json
          cognitive_budget_json: Json
          pedagogical_contract_json: Json
          total_duration_sec: number
          needs_splitting: boolean
          split_modules_json: Json | null
          reasoning_type: string
          objective: string
          learner_audience_profile_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          course_profile_id: string
          user_id: string
          segments_json?: Json
          concept_order_json?: Json
          repetition_plan_json?: Json
          mnemonics_json?: Json
          visual_anchors_json?: Json
          cognitive_budget_json?: Json
          pedagogical_contract_json?: Json
          total_duration_sec?: number
          needs_splitting?: boolean
          split_modules_json?: Json | null
          reasoning_type?: string
          objective?: string
          learner_audience_profile_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          course_profile_id?: string
          user_id?: string
          segments_json?: Json
          concept_order_json?: Json
          repetition_plan_json?: Json
          mnemonics_json?: Json
          visual_anchors_json?: Json
          cognitive_budget_json?: Json
          pedagogical_contract_json?: Json
          total_duration_sec?: number
          needs_splitting?: boolean
          split_modules_json?: Json | null
          reasoning_type?: string
          objective?: string
          learner_audience_profile_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_architectures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_architectures_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_qa_results: {
        Row: {
          id: string
          mission_id: string
          overall_score: number
          checks_json: Json
          publish_blocked: boolean
          blocking_violations_json: Json
          warnings_json: Json
          retention_report_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          mission_id: string
          overall_score?: number
          checks_json?: Json
          publish_blocked?: boolean
          blocking_violations_json?: Json
          warnings_json?: Json
          retention_report_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          mission_id?: string
          overall_score?: number
          checks_json?: Json
          publish_blocked?: boolean
          blocking_violations_json?: Json
          warnings_json?: Json
          retention_report_json?: Json
          created_at?: string
        }
        Relationships: []
      }
      mission_runs: {
        Row: {
          id: string
          mission_id: string
          user_id: string
          started_at: string
          completed_at: string | null
          completion_status: string
          room_events_json: Json
          difficulty_snapshot_json: Json
          score_composite_json: Json
          debrief_json: Json | null
        }
        Insert: {
          id?: string
          mission_id: string
          user_id: string
          started_at?: string
          completed_at?: string | null
          completion_status?: string
          room_events_json?: Json
          difficulty_snapshot_json?: Json
          score_composite_json?: Json
          debrief_json?: Json | null
        }
        Update: {
          id?: string
          mission_id?: string
          user_id?: string
          started_at?: string
          completed_at?: string | null
          completion_status?: string
          room_events_json?: Json
          difficulty_snapshot_json?: Json
          score_composite_json?: Json
          debrief_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_runs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "generated_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          song_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          song_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          song_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_events: {
        Row: {
          id: string
          event_type: string
          severity: string
          mission_id: string | null
          document_id: string | null
          user_id: string | null
          payload_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          severity?: string
          mission_id?: string | null
          document_id?: string | null
          user_id?: string | null
          payload_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          severity?: string
          mission_id?: string | null
          document_id?: string | null
          user_id?: string | null
          payload_json?: Json
          created_at?: string
        }
        Relationships: []
      }
      plan_format_matrix: {
        Row: {
          id: string
          plan_key: string
          feature_key: string
          availability: string
          monthly_quota: number
          overage_allowed: boolean
          topup_eligible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_key: string
          feature_key: string
          availability?: string
          monthly_quota?: number
          overage_allowed?: boolean
          topup_eligible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_key?: string
          feature_key?: string
          availability?: string
          monthly_quota?: number
          overage_allowed?: boolean
          topup_eligible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_plan_prices: {
        Row: {
          id: string
          plan_id: string
          zone_id: string
          currency: string
          monthly_price: number
          annual_price: number
          stripe_price_id_monthly: string | null
          stripe_price_id_annual: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          zone_id: string
          currency?: string
          monthly_price: number
          annual_price: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_annual?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          zone_id?: string
          currency?: string
          monthly_price?: number
          annual_price?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_annual?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_plan_prices_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "pricing_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          id: string
          plan_key: string
          name: string
          segment: string
          active: boolean
          features_json: Json
          quotas_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_key: string
          name: string
          segment: string
          active?: boolean
          features_json?: Json
          quotas_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_key?: string
          name?: string
          segment?: string
          active?: boolean
          features_json?: Json
          quotas_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_zones: {
        Row: {
          id: string
          zone_key: string
          label: string
          countries_json: Json
          multiplier: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          zone_key: string
          label: string
          countries_json?: Json
          multiplier?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          zone_key?: string
          label?: string
          countries_json?: Json
          multiplier?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_events: {
        Row: {
          id: string
          user_id: string | null
          anonymous_id: string | null
          transformation_id: string | null
          event_name: string
          audience_level: string | null
          format: string | null
          metadata_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          anonymous_id?: string | null
          transformation_id?: string | null
          event_name: string
          audience_level?: string | null
          format?: string | null
          metadata_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          anonymous_id?: string | null
          transformation_id?: string | null
          event_name?: string
          audience_level?: string | null
          format?: string | null
          metadata_json?: Json
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          field_of_study: string | null
          id: string
          university: string | null
          updated_at: string
          user_id: string
          preferred_ui_language: string | null
          preferred_generation_language: string | null
          preferred_guardian_language: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          field_of_study?: string | null
          id?: string
          university?: string | null
          updated_at?: string
          user_id: string
          preferred_ui_language?: string | null
          preferred_generation_language?: string | null
          preferred_guardian_language?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          field_of_study?: string | null
          id?: string
          university?: string | null
          updated_at?: string
          user_id?: string
          preferred_ui_language?: string | null
          preferred_generation_language?: string | null
          preferred_guardian_language?: string | null
        }
        Relationships: []
      }
      prompt_versions: {
        Row: {
          id: string
          prompt_name: string
          semantic_version: string
          changelog: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          prompt_name: string
          semantic_version?: string
          changelog?: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          prompt_name?: string
          semantic_version?: string
          changelog?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          id: string
          domain: string
          provider_key: string
          provider_type: string
          enabled: boolean
          config_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          domain: string
          provider_key: string
          provider_type: string
          enabled?: boolean
          config_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          domain?: string
          provider_key?: string
          provider_type?: string
          enabled?: boolean
          config_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_routes: {
        Row: {
          id: string
          domain: string
          preferred_provider_key: string
          fallback_provider_key: string | null
          rules_json: Json
          updated_at: string
        }
        Insert: {
          id?: string
          domain: string
          preferred_provider_key: string
          fallback_provider_key?: string | null
          rules_json?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          domain?: string
          preferred_provider_key?: string
          fallback_provider_key?: string | null
          rules_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      publish_decisions: {
        Row: {
          id: string
          transformation_id: string
          qa_report_id: string
          user_id: string
          status: string
          reason: string | null
          decided_at: string
        }
        Insert: {
          id?: string
          transformation_id: string
          qa_report_id: string
          user_id: string
          status?: string
          reason?: string | null
          decided_at?: string
        }
        Update: {
          id?: string
          transformation_id?: string
          qa_report_id?: string
          user_id?: string
          status?: string
          reason?: string | null
          decided_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_decisions_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "transformations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_decisions_qa_report_id_fkey"
            columns: ["qa_report_id"]
            isOneToOne: false
            referencedRelation: "qa_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_reports: {
        Row: {
          id: string
          transformation_id: string
          user_id: string
          score: number
          status: string
          report_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          transformation_id: string
          user_id: string
          score?: number
          status?: string
          report_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          transformation_id?: string
          user_id?: string
          score?: number
          status?: string
          report_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_reports_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "transformations"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_attempts: {
        Row: {
          id: string
          recall_test_id: string
          user_id: string
          answers_json: Json
          raw_score: number
          confidence_score: number
          calibration_gap: number
          composite_score: number
          created_at: string
        }
        Insert: {
          id?: string
          recall_test_id: string
          user_id: string
          answers_json?: Json
          raw_score?: number
          confidence_score?: number
          calibration_gap?: number
          composite_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          recall_test_id?: string
          user_id?: string
          answers_json?: Json
          raw_score?: number
          confidence_score?: number
          calibration_gap?: number
          composite_score?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_attempts_recall_test_id_fkey"
            columns: ["recall_test_id"]
            isOneToOne: false
            referencedRelation: "recall_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_tests: {
        Row: {
          id: string
          user_id: string
          transformation_id: string
          test_type: string
          questions_json: Json
          generated_from_version: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transformation_id: string
          test_type: string
          questions_json?: Json
          generated_from_version?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transformation_id?: string
          test_type?: string
          questions_json?: Json
          generated_from_version?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_tests_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "transformations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queue: {
        Row: {
          id: string
          user_id: string
          concept_stable_key: string
          priority_score: number
          reason: string
          recommended_format: string
          recommended_action: string
          due_at: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          concept_stable_key: string
          priority_score: number
          reason: string
          recommended_format: string
          recommended_action: string
          due_at: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          concept_stable_key?: string
          priority_score?: number
          reason?: string
          recommended_format?: string
          recommended_action?: string
          due_at?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          severity: string
          ip_hash: string | null
          metadata_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          severity?: string
          ip_hash?: string | null
          metadata_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          severity?: string
          ip_hash?: string | null
          metadata_json?: Json
          created_at?: string
        }
        Relationships: []
      }
      seed_transformations: {
        Row: {
          id: string
          title: string
          subject: string
          audience_level: string
          format: string
          transformation_json: Json
          recall_tests_json: Json
          debrief_demo_json: Json
          feature_flags_json: Json
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          subject: string
          audience_level: string
          format: string
          transformation_json: Json
          recall_tests_json: Json
          debrief_demo_json?: Json
          feature_flags_json?: Json
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          subject?: string
          audience_level?: string
          format?: string
          transformation_json?: Json
          recall_tests_json?: Json
          debrief_demo_json?: Json
          feature_flags_json?: Json
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          id: string
          joined_at: string
          session_id: string
          subtopic: string | null
          user_id: string
          verse_text: string | null
        }
        Insert: {
          id?: string
          joined_at?: string
          session_id: string
          subtopic?: string | null
          user_id: string
          verse_text?: string | null
        }
        Update: {
          id?: string
          joined_at?: string
          session_id?: string
          subtopic?: string | null
          user_id?: string
          verse_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      song_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating?: number
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_ratings_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          audio_url: string | null
          cover_image_url: string | null
          created_at: string
          duration: number | null
          generated_lyrics: string | null
          generation_error: string | null
          generation_error_at: string | null
          generation_error_code: string | null
          id: string
          is_final_quality: boolean
          is_public: boolean
          lyrics_metadata: string | null
          original_text: string
          status: string
          style: string
          subject: string | null
          suno_task_id: string | null
          title: string
          updated_at: string
          user_id: string
          learner_lyrics_profile_json: Json | null
          canonical_lyrics: string | null
          audio_safe_lyrics: string | null
          lyrics_version: number | null
          audience_level: string | null
          vocabulary_level: string | null
          density_level: string | null
          sanitizer_report_json: Json | null
          generation_language: string | null
        }
        Insert: {
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          duration?: number | null
          generated_lyrics?: string | null
          generation_error?: string | null
          generation_error_at?: string | null
          generation_error_code?: string | null
          id?: string
          is_final_quality?: boolean
          is_public?: boolean
          lyrics_metadata?: string | null
          original_text: string
          status?: string
          style?: string
          subject?: string | null
          suno_task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          learner_lyrics_profile_json?: Json | null
          canonical_lyrics?: string | null
          audio_safe_lyrics?: string | null
          lyrics_version?: number | null
          audience_level?: string | null
          vocabulary_level?: string | null
          density_level?: string | null
          sanitizer_report_json?: Json | null
          generation_language?: string | null
        }
        Update: {
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          duration?: number | null
          generated_lyrics?: string | null
          generation_error?: string | null
          generation_error_at?: string | null
          generation_error_code?: string | null
          id?: string
          is_final_quality?: boolean
          is_public?: boolean
          lyrics_metadata?: string | null
          original_text?: string
          status?: string
          style?: string
          subject?: string | null
          suno_task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          learner_lyrics_profile_json?: Json | null
          canonical_lyrics?: string | null
          audio_safe_lyrics?: string | null
          lyrics_version?: number | null
          audience_level?: string | null
          vocabulary_level?: string | null
          density_level?: string | null
          sanitizer_report_json?: Json | null
          generation_language?: string | null
        }
        Relationships: []
      }
      source_documents: {
        Row: {
          id: string
          user_id: string
          original_filename: string | null
          content_type: string
          source_type: string
          source_language: string | null
          source_reliability_score: number
          quality_score: number
          ingestion_status: string
          warnings_json: Json
          raw_storage_path: string | null
          parsed_text_storage_path: string | null
          detailed_source_type: string | null
          detected_structure: string | null
          word_count: number | null
          detected_language: string | null
          parsing_latency_ms: number | null
          learner_audience_profile_json: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_filename?: string | null
          content_type?: string
          source_type?: string
          source_language?: string | null
          source_reliability_score?: number
          quality_score?: number
          ingestion_status?: string
          warnings_json?: Json
          raw_storage_path?: string | null
          parsed_text_storage_path?: string | null
          detailed_source_type?: string | null
          detected_structure?: string | null
          word_count?: number | null
          detected_language?: string | null
          parsing_latency_ms?: number | null
          learner_audience_profile_json?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          original_filename?: string | null
          content_type?: string
          source_type?: string
          source_language?: string | null
          source_reliability_score?: number
          quality_score?: number
          ingestion_status?: string
          warnings_json?: Json
          raw_storage_path?: string | null
          parsed_text_storage_path?: string | null
          detailed_source_type?: string | null
          detected_structure?: string | null
          word_count?: number | null
          detected_language?: string | null
          parsing_latency_ms?: number | null
          learner_audience_profile_json?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supported_locales: {
        Row: {
          code: string
          label: string
          dir: string
          html_lang: string
          tts_locale: string
          fallback: string
          enabled: boolean
          created_at: string
        }
        Insert: {
          code: string
          label: string
          dir?: string
          html_lang: string
          tts_locale: string
          fallback: string
          enabled?: boolean
          created_at?: string
        }
        Update: {
          code?: string
          label?: string
          dir?: string
          html_lang?: string
          tts_locale?: string
          fallback?: string
          enabled?: boolean
          created_at?: string
        }
        Relationships: []
      }
      suspicious_activity_flags: {
        Row: {
          id: string
          user_id: string | null
          flag_type: string
          status: string
          details_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          flag_type: string
          status?: string
          details_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          flag_type?: string
          status?: string
          details_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transformations: {
        Row: {
          id: string
          user_id: string
          document_id: string
          course_profile_id: string
          memory_architecture_id: string
          format_decision_id: string
          format: string
          strategy: string
          published_status: string
          qa_status: string
          estimated_duration_sec: number
          learner_audience_profile_json: Json | null
          generation_language: string | null
          ui_language_snapshot: string | null
          source_language: string | null
          target_language: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          course_profile_id: string
          memory_architecture_id: string
          format_decision_id: string
          format?: string
          strategy?: string
          published_status?: string
          qa_status?: string
          estimated_duration_sec?: number
          learner_audience_profile_json?: Json | null
          generation_language?: string | null
          ui_language_snapshot?: string | null
          source_language?: string | null
          target_language?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string
          course_profile_id?: string
          memory_architecture_id?: string
          format_decision_id?: string
          format?: string
          strategy?: string
          published_status?: string
          qa_status?: string
          estimated_duration_sec?: number
          learner_audience_profile_json?: Json | null
          generation_language?: string | null
          ui_language_snapshot?: string | null
          source_language?: string | null
          target_language?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformations_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformations_memory_architecture_id_fkey"
            columns: ["memory_architecture_id"]
            isOneToOne: false
            referencedRelation: "memory_architectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformations_format_decision_id_fkey"
            columns: ["format_decision_id"]
            isOneToOne: false
            referencedRelation: "format_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_quotas: {
        Row: {
          created_at: string
          id: string
          month: string
          songs_generated: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          songs_generated?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          songs_generated?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_quotas_v2: {
        Row: {
          id: string
          user_id: string
          billing_period_start: string
          billing_period_end: string
          counters_json: Json
          plan_snapshot_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          billing_period_start: string
          billing_period_end: string
          counters_json?: Json
          plan_snapshot_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          billing_period_start?: string
          billing_period_end?: string
          counters_json?: Json
          plan_snapshot_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_credit_balances: {
        Row: {
          id: string
          user_id: string
          credit_type: string
          remaining: number
          expires_at: string | null
          purchase_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          credit_type: string
          remaining?: number
          expires_at?: string | null
          purchase_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          credit_type?: string
          remaining?: number
          expires_at?: string | null
          purchase_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_entitlement_snapshots: {
        Row: {
          id: string
          user_id: string
          plan_key: string
          computed_at: string
          entitlements_json: Json
          flex_credits_json: Json
          active_topups_json: Json
          restrictions_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_key: string
          computed_at?: string
          entitlements_json?: Json
          flex_credits_json?: Json
          active_topups_json?: Json
          restrictions_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_key?: string
          computed_at?: string
          entitlements_json?: Json
          flex_credits_json?: Json
          active_topups_json?: Json
          restrictions_json?: Json
          created_at?: string
        }
        Relationships: []
      }
      user_guardians: {
        Row: {
          id: string
          user_id: string
          guardian_id: string
          relationship: string
          status: string
          granted_at: string | null
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          guardian_id: string
          relationship?: string
          status?: string
          granted_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          guardian_id?: string
          relationship?: string
          status?: string
          granted_at?: string | null
          revoked_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      user_minor_profiles: {
        Row: {
          id: string
          user_id: string
          is_minor: boolean
          birth_year: number | null
          country_code: string | null
          minor_mode_enabled: boolean
          content_filter_level: string
          max_daily_minutes: number | null
          allowed_hours_start: number | null
          allowed_hours_end: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          is_minor?: boolean
          birth_year?: number | null
          country_code?: string | null
          minor_mode_enabled?: boolean
          content_filter_level?: string
          max_daily_minutes?: number | null
          allowed_hours_start?: number | null
          allowed_hours_end?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          is_minor?: boolean
          birth_year?: number | null
          country_code?: string | null
          minor_mode_enabled?: boolean
          content_filter_level?: string
          max_daily_minutes?: number | null
          allowed_hours_start?: number | null
          allowed_hours_end?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_usage_profiles: {
        Row: {
          id: string
          user_id: string
          dominant_usage_profile: string
          rolling_30d_usage_json: Json
          last_detected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dominant_usage_profile?: string
          rolling_30d_usage_json?: Json
          last_detected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dominant_usage_profile?: string
          rolling_30d_usage_json?: Json
          last_detected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_assets: {
        Row: {
          id: string
          project_id: string
          asset_type: string
          storage_path: string
          metadata_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          asset_type: string
          storage_path: string
          metadata_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          asset_type?: string
          storage_path?: string
          metadata_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      video_generation_plans: {
        Row: {
          id: string
          project_id: string
          scenes_json: Json
          shot_list_json: Json
          visual_direction_json: Json
          subtitle_plan_json: Json
          fallback_render_plan_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          scenes_json?: Json
          shot_list_json?: Json
          visual_direction_json?: Json
          subtitle_plan_json?: Json
          fallback_render_plan_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          scenes_json?: Json
          shot_list_json?: Json
          visual_direction_json?: Json
          subtitle_plan_json?: Json
          fallback_render_plan_json?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_generation_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      video_projects: {
        Row: {
          id: string
          user_id: string
          project_type: string
          title: string
          synopsis: string | null
          enriched_synopsis_json: Json
          status: string
          provider_requested: string | null
          provider_used: string | null
          mode: string
          estimated_duration_sec: number | null
          estimated_shots: number | null
          estimated_credits: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_type: string
          title: string
          synopsis?: string | null
          enriched_synopsis_json?: Json
          status?: string
          provider_requested?: string | null
          provider_used?: string | null
          mode?: string
          estimated_duration_sec?: number | null
          estimated_shots?: number | null
          estimated_credits?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_type?: string
          title?: string
          synopsis?: string | null
          enriched_synopsis_json?: Json
          status?: string
          provider_requested?: string | null
          provider_used?: string | null
          mode?: string
          estimated_duration_sec?: number | null
          estimated_shots?: number | null
          estimated_credits?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_provider_runs: {
        Row: {
          id: string
          project_id: string
          provider_key: string
          run_type: string
          status: string
          request_json: Json
          response_json: Json
          error_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          provider_key: string
          run_type: string
          status?: string
          request_json?: Json
          response_json?: Json
          error_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          provider_key?: string
          run_type?: string
          status?: string
          request_json?: Json
          response_json?: Json
          error_json?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_provider_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          id: string
          provider_key: string
          event_type: string
          payload_json: Json
          processed: boolean
          processed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_key: string
          event_type: string
          payload_json?: Json
          processed?: boolean
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_key?: string
          event_type?: string
          payload_json?: Json
          processed?: boolean
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      webhook_replay_protection: {
        Row: {
          id: string
          provider_key: string
          external_event_id: string
          processed_at: string
        }
        Insert: {
          id?: string
          provider_key: string
          external_event_id: string
          processed_at?: string
        }
        Update: {
          id?: string
          provider_key?: string
          external_event_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      worker_nodes: {
        Row: {
          id: string
          node_key: string
          node_type: string
          capabilities_json: Json
          status: string
          last_seen_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          node_key: string
          node_type: string
          capabilities_json?: Json
          status?: string
          last_seen_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          node_key?: string
          node_type?: string
          capabilities_json?: Json
          status?: string
          last_seen_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_platform_stats: { Args: Record<string, never>; Returns: Json }
      increment_quota_atomic: {
        Args: { p_limit: number; p_month: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
