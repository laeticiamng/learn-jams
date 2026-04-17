export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adaptive_credit_balances: {
        Row: {
          consumed_flex_credits_json: Json | null
          created_at: string
          id: string
          reallocation_log_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consumed_flex_credits_json?: Json | null
          created_at?: string
          id?: string
          reallocation_log_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consumed_flex_credits_json?: Json | null
          created_at?: string
          id?: string
          reallocation_log_json?: Json | null
          updated_at?: string
          user_id?: string
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
          bloom_target: string | null
          category: string | null
          course_profile_id: string
          created_at: string
          criticality: number
          criticality_score: number | null
          definition: string | null
          id: string
          label: string
          prerequisites_json: Json | null
          relations_json: Json | null
          source_confidence: number | null
          source_trace_json: Json | null
          stable_key: string
          uncertain: boolean | null
        }
        Insert: {
          bloom_target?: string | null
          category?: string | null
          course_profile_id: string
          created_at?: string
          criticality?: number
          criticality_score?: number | null
          definition?: string | null
          id?: string
          label?: string
          prerequisites_json?: Json | null
          relations_json?: Json | null
          source_confidence?: number | null
          source_trace_json?: Json | null
          stable_key?: string
          uncertain?: boolean | null
        }
        Update: {
          bloom_target?: string | null
          category?: string | null
          course_profile_id?: string
          created_at?: string
          criticality?: number
          criticality_score?: number | null
          definition?: string | null
          id?: string
          label?: string
          prerequisites_json?: Json | null
          relations_json?: Json | null
          source_confidence?: number | null
          source_trace_json?: Json | null
          stable_key?: string
          uncertain?: boolean | null
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
          concept_a_id: string | null
          concept_b_id: string | null
          course_profile_id: string
          created_at: string
          distinction_key: string | null
          frequency: number | null
          id: string
        }
        Insert: {
          concept_a_id?: string | null
          concept_b_id?: string | null
          course_profile_id: string
          created_at?: string
          distinction_key?: string | null
          frequency?: number | null
          id?: string
        }
        Update: {
          concept_a_id?: string | null
          concept_b_id?: string | null
          course_profile_id?: string
          created_at?: string
          distinction_key?: string | null
          frequency?: number | null
          id?: string
        }
        Relationships: [
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
          {
            foreignKeyName: "confusion_pairs_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_events: {
        Row: {
          consent_type: string
          created_at: string
          event_type: string | null
          granted: boolean | null
          guardian_id: string | null
          id: string
          ip_address: string | null
          metadata_json: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          event_type?: string | null
          granted?: boolean | null
          guardian_id?: string | null
          id?: string
          ip_address?: string | null
          metadata_json?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          event_type?: string | null
          granted?: boolean | null
          guardian_id?: string | null
          id?: string
          ip_address?: string | null
          metadata_json?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
          actual_cost_usd: number | null
          created_at: string
          estimated_cost_usd: number | null
          feature_key: string
          id: string
          metadata_json: Json | null
          provider_key: string
          user_id: string | null
        }
        Insert: {
          actual_cost_usd?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          feature_key: string
          id?: string
          metadata_json?: Json | null
          provider_key?: string
          user_id?: string | null
        }
        Update: {
          actual_cost_usd?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          feature_key?: string
          id?: string
          metadata_json?: Json | null
          provider_key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      course_profiles: {
        Row: {
          ambiguous_zones_json: Json | null
          concepts_confidence: number | null
          created_at: string
          critical_count: number | null
          density: string | null
          document_id: string
          estimated_complexity: number | null
          id: string
          learning_objectives_json: Json | null
          logic_confidence: number | null
          main_topic: string
          prerequis_json: Json | null
          reasoning_type: string | null
          recommended_template: string | null
          source_issues_json: Json | null
          structure_confidence: number | null
          structure_type: string | null
          total_concepts: number | null
          traps_confidence: number | null
          traps_json: Json | null
        }
        Insert: {
          ambiguous_zones_json?: Json | null
          concepts_confidence?: number | null
          created_at?: string
          critical_count?: number | null
          density?: string | null
          document_id: string
          estimated_complexity?: number | null
          id?: string
          learning_objectives_json?: Json | null
          logic_confidence?: number | null
          main_topic?: string
          prerequis_json?: Json | null
          reasoning_type?: string | null
          recommended_template?: string | null
          source_issues_json?: Json | null
          structure_confidence?: number | null
          structure_type?: string | null
          total_concepts?: number | null
          traps_confidence?: number | null
          traps_json?: Json | null
        }
        Update: {
          ambiguous_zones_json?: Json | null
          concepts_confidence?: number | null
          created_at?: string
          critical_count?: number | null
          density?: string | null
          document_id?: string
          estimated_complexity?: number | null
          id?: string
          learning_objectives_json?: Json | null
          logic_confidence?: number | null
          main_topic?: string
          prerequis_json?: Json | null
          reasoning_type?: string | null
          recommended_template?: string | null
          source_issues_json?: Json | null
          structure_confidence?: number | null
          structure_type?: string | null
          total_concepts?: number | null
          traps_confidence?: number | null
          traps_json?: Json | null
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
      daily_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_active_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      debrief_reports: {
        Row: {
          created_at: string
          id: string
          mission_run_id: string | null
          report_json: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_run_id?: string | null
          report_json?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_run_id?: string | null
          report_json?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debrief_reports_mission_run_id_fkey"
            columns: ["mission_run_id"]
            isOneToOne: false
            referencedRelation: "mission_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_segments: {
        Row: {
          confidence_score: number
          content: string
          created_at: string
          document_id: string
          hierarchy_level: number
          id: string
          page_ref: number | null
          segment_index: number
          title: string | null
        }
        Insert: {
          confidence_score?: number
          content?: string
          created_at?: string
          document_id: string
          hierarchy_level?: number
          id?: string
          page_ref?: number | null
          segment_index?: number
          title?: string | null
        }
        Update: {
          confidence_score?: number
          content?: string
          created_at?: string
          document_id?: string
          hierarchy_level?: number
          id?: string
          page_ref?: number | null
          segment_index?: number
          title?: string | null
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
      experiment_assignments: {
        Row: {
          anonymous_id: string | null
          created_at: string
          experiment_key: string
          id: string
          user_id: string
          variant: string
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          experiment_key: string
          id?: string
          user_id: string
          variant?: string
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          experiment_key?: string
          id?: string
          user_id?: string
          variant?: string
        }
        Relationships: []
      }
      experiment_measurements: {
        Row: {
          created_at: string
          experiment_key: string
          experiment_run_id: string | null
          id: string
          measure_key: string | null
          measure_value_numeric: number | null
          measure_value_text: string | null
          metadata_json: Json | null
          metric_key: string
          metric_value: number | null
          user_id: string | null
          variant: string | null
        }
        Insert: {
          created_at?: string
          experiment_key: string
          experiment_run_id?: string | null
          id?: string
          measure_key?: string | null
          measure_value_numeric?: number | null
          measure_value_text?: string | null
          metadata_json?: Json | null
          metric_key: string
          metric_value?: number | null
          user_id?: string | null
          variant?: string | null
        }
        Update: {
          created_at?: string
          experiment_key?: string
          experiment_run_id?: string | null
          id?: string
          measure_key?: string | null
          measure_value_numeric?: number | null
          measure_value_text?: string | null
          metadata_json?: Json | null
          metric_key?: string
          metric_value?: number | null
          user_id?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      experiment_runs: {
        Row: {
          assignment_id: string | null
          completed_at: string | null
          config_json: Json | null
          created_at: string
          ended_at: string | null
          experiment_key: string
          id: string
          started_at: string | null
          status: string | null
          transformation_id: string | null
        }
        Insert: {
          assignment_id?: string | null
          completed_at?: string | null
          config_json?: Json | null
          created_at?: string
          ended_at?: string | null
          experiment_key: string
          id?: string
          started_at?: string | null
          status?: string | null
          transformation_id?: string | null
        }
        Update: {
          assignment_id?: string | null
          completed_at?: string | null
          config_json?: Json | null
          created_at?: string
          ended_at?: string | null
          experiment_key?: string
          id?: string
          started_at?: string | null
          status?: string | null
          transformation_id?: string | null
        }
        Relationships: []
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
          created_at: string
          description: string | null
          enabled: boolean | null
          flag_key: string
          id: string
          metadata_json: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          flag_key: string
          id?: string
          metadata_json?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          flag_key?: string
          id?: string
          metadata_json?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      final_tests: {
        Row: {
          bloom_level: number | null
          bloom_levels_count: number | null
          choices_json: Json | null
          concepts_tested_json: Json | null
          created_at: string
          expected_answer_json: Json | null
          id: string
          item_type: string | null
          prompt: string | null
          question_count: number | null
          questions_json: Json | null
          test_item_id: string | null
          transformation_id: string | null
        }
        Insert: {
          bloom_level?: number | null
          bloom_levels_count?: number | null
          choices_json?: Json | null
          concepts_tested_json?: Json | null
          created_at?: string
          expected_answer_json?: Json | null
          id?: string
          item_type?: string | null
          prompt?: string | null
          question_count?: number | null
          questions_json?: Json | null
          test_item_id?: string | null
          transformation_id?: string | null
        }
        Update: {
          bloom_level?: number | null
          bloom_levels_count?: number | null
          choices_json?: Json | null
          concepts_tested_json?: Json | null
          created_at?: string
          expected_answer_json?: Json | null
          id?: string
          item_type?: string | null
          prompt?: string | null
          question_count?: number | null
          questions_json?: Json | null
          test_item_id?: string | null
          transformation_id?: string | null
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
          architecture_id: string | null
          chosen_format: string | null
          cost_level: string | null
          created_at: string
          decision_trace_json: Json | null
          estimated_duration_sec: number | null
          id: string
          justification: string | null
          matrix_reasoning: string | null
          modules_json: Json | null
          needs_split: boolean | null
          overrides_applied_json: Json | null
          split_count: number | null
        }
        Insert: {
          architecture_id?: string | null
          chosen_format?: string | null
          cost_level?: string | null
          created_at?: string
          decision_trace_json?: Json | null
          estimated_duration_sec?: number | null
          id?: string
          justification?: string | null
          matrix_reasoning?: string | null
          modules_json?: Json | null
          needs_split?: boolean | null
          overrides_applied_json?: Json | null
          split_count?: number | null
        }
        Update: {
          architecture_id?: string | null
          chosen_format?: string | null
          cost_level?: string | null
          created_at?: string
          decision_trace_json?: Json | null
          estimated_duration_sec?: number | null
          id?: string
          justification?: string | null
          matrix_reasoning?: string | null
          modules_json?: Json | null
          needs_split?: boolean | null
          overrides_applied_json?: Json | null
          split_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "format_decisions_architecture_id_fkey"
            columns: ["architecture_id"]
            isOneToOne: false
            referencedRelation: "memory_architectures"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_contents: {
        Row: {
          block_id: string | null
          block_type: string
          concepts_covered_json: Json | null
          content: string | null
          content_json: Json | null
          contrast_box_json: Json | null
          coverage_json: Json | null
          created_at: string
          generation_flags_json: Json | null
          id: string
          internal_summary_json: Json | null
          mnemonic_json: Json | null
          position: number | null
          recall_event_json: Json | null
          source_disclaimer_json: Json | null
          title: string | null
          transformation_id: string | null
          version: number | null
          visual_anchor_json: Json | null
        }
        Insert: {
          block_id?: string | null
          block_type?: string
          concepts_covered_json?: Json | null
          content?: string | null
          content_json?: Json | null
          contrast_box_json?: Json | null
          coverage_json?: Json | null
          created_at?: string
          generation_flags_json?: Json | null
          id?: string
          internal_summary_json?: Json | null
          mnemonic_json?: Json | null
          position?: number | null
          recall_event_json?: Json | null
          source_disclaimer_json?: Json | null
          title?: string | null
          transformation_id?: string | null
          version?: number | null
          visual_anchor_json?: Json | null
        }
        Update: {
          block_id?: string | null
          block_type?: string
          concepts_covered_json?: Json | null
          content?: string | null
          content_json?: Json | null
          contrast_box_json?: Json | null
          coverage_json?: Json | null
          created_at?: string
          generation_flags_json?: Json | null
          id?: string
          internal_summary_json?: Json | null
          mnemonic_json?: Json | null
          position?: number | null
          recall_event_json?: Json | null
          source_disclaimer_json?: Json | null
          title?: string | null
          transformation_id?: string | null
          version?: number | null
          visual_anchor_json?: Json | null
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
          chosen_format: string | null
          course_profile_id: string | null
          created_at: string
          document_id: string | null
          fallback_mode: string | null
          generation_mode: string | null
          id: string
          includes_boss: boolean | null
          mission_json: Json | null
          narrative_template: string | null
          published_status: string | null
          qa_score: number | null
          quality_band: string | null
          room_count: number | null
          user_id: string
        }
        Insert: {
          chosen_format?: string | null
          course_profile_id?: string | null
          created_at?: string
          document_id?: string | null
          fallback_mode?: string | null
          generation_mode?: string | null
          id?: string
          includes_boss?: boolean | null
          mission_json?: Json | null
          narrative_template?: string | null
          published_status?: string | null
          qa_score?: number | null
          quality_band?: string | null
          room_count?: number | null
          user_id: string
        }
        Update: {
          chosen_format?: string | null
          course_profile_id?: string | null
          created_at?: string
          document_id?: string | null
          fallback_mode?: string | null
          generation_mode?: string | null
          id?: string
          includes_boss?: boolean | null
          mission_json?: Json | null
          narrative_template?: string | null
          published_status?: string | null
          qa_score?: number | null
          quality_band?: string | null
          room_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_missions_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_missions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_artifacts: {
        Row: {
          artifact_type: string
          created_at: string
          id: string
          job_id: string
          metadata_json: Json | null
          storage_path: string | null
        }
        Insert: {
          artifact_type?: string
          created_at?: string
          id?: string
          job_id: string
          metadata_json?: Json | null
          storage_path?: string | null
        }
        Update: {
          artifact_type?: string
          created_at?: string
          id?: string
          job_id?: string
          metadata_json?: Json | null
          storage_path?: string | null
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
          created_at: string
          domain: string | null
          error_message: string | null
          id: string
          input_json: Json | null
          max_retries: number | null
          output_json: Json | null
          retry_count: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          domain?: string | null
          error_message?: string | null
          id?: string
          input_json?: Json | null
          max_retries?: number | null
          output_json?: Json | null
          retry_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          domain?: string | null
          error_message?: string | null
          id?: string
          input_json?: Json | null
          max_retries?: number | null
          output_json?: Json | null
          retry_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      golden_dataset_runs: {
        Row: {
          created_at: string
          dataset_name: string
          id: string
          metrics_json: Json | null
          pass: boolean | null
          prompt_version_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_name?: string
          id?: string
          metrics_json?: Json | null
          pass?: boolean | null
          prompt_version_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_name?: string
          id?: string
          metrics_json?: Json | null
          pass?: boolean | null
          prompt_version_id?: string | null
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
          channel: string | null
          created_at: string
          enabled: boolean | null
          frequency: string | null
          guardian_id: string
          id: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          enabled?: boolean | null
          frequency?: string | null
          guardian_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          enabled?: boolean | null
          frequency?: string | null
          guardian_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_notification_preferences_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_notification_preferences_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_notifications: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          is_read: boolean | null
          message: string | null
          metadata_json: Json | null
          notification_type: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata_json?: Json | null
          notification_type?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata_json?: Json | null
          notification_type?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_notifications_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_notifications_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invite_used_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invite_used_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invite_used_at?: string | null
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
          concept_a_key: string
          concept_b_key: string
          created_at: string
          hits_count: number | null
          id: string
          resolved: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concept_a_key: string
          concept_b_key: string
          created_at?: string
          hits_count?: number | null
          id?: string
          resolved?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concept_a_key?: string
          concept_b_key?: string
          created_at?: string
          hits_count?: number | null
          id?: string
          resolved?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_format_effectiveness: {
        Row: {
          attempts_count: number | null
          created_at: string
          engagement_score: number | null
          format: string
          id: string
          metadata_json: Json | null
          retention_rate: number | null
          retention_signal: number | null
          sessions_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          created_at?: string
          engagement_score?: number | null
          format?: string
          id?: string
          metadata_json?: Json | null
          retention_rate?: number | null
          retention_signal?: number | null
          sessions_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          created_at?: string
          engagement_score?: number | null
          format?: string
          id?: string
          metadata_json?: Json | null
          retention_rate?: number | null
          retention_signal?: number | null
          sessions_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_knowledge_graph: {
        Row: {
          archived: boolean | null
          concept_stable_key: string
          confusion_hits: number | null
          id: string
          last_seen_at: string | null
          mastery_score: number | null
          mastery_status: string | null
          metadata_json: Json | null
          next_review_at: string | null
          observations_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          concept_stable_key: string
          confusion_hits?: number | null
          id?: string
          last_seen_at?: string | null
          mastery_score?: number | null
          mastery_status?: string | null
          metadata_json?: Json | null
          next_review_at?: string | null
          observations_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean | null
          concept_stable_key?: string
          confusion_hits?: number | null
          id?: string
          last_seen_at?: string | null
          mastery_score?: number | null
          mastery_status?: string | null
          metadata_json?: Json | null
          next_review_at?: string | null
          observations_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_profiles: {
        Row: {
          calibration_sessions_count: number | null
          cognitive_profile_json: Json | null
          created_at: string
          id: string
          level_declared: string | null
          profile_status: string
          session_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calibration_sessions_count?: number | null
          cognitive_profile_json?: Json | null
          created_at?: string
          id?: string
          level_declared?: string | null
          profile_status?: string
          session_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calibration_sessions_count?: number | null
          cognitive_profile_json?: Json | null
          created_at?: string
          id?: string
          level_declared?: string | null
          profile_status?: string
          session_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learner_progress_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics_json: Json | null
          snapshot_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics_json?: Json | null
          snapshot_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics_json?: Json | null
          snapshot_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      margin_reports: {
        Row: {
          created_at: string
          details_json: Json | null
          id: string
          margin_pct: number | null
          period_end: string | null
          period_start: string | null
          total_cost_usd: number | null
          total_revenue_usd: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details_json?: Json | null
          id?: string
          margin_pct?: number | null
          period_end?: string | null
          period_start?: string | null
          total_cost_usd?: number | null
          total_revenue_usd?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details_json?: Json | null
          id?: string
          margin_pct?: number | null
          period_end?: string | null
          period_start?: string | null
          total_cost_usd?: number | null
          total_revenue_usd?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      memory_architectures: {
        Row: {
          cognitive_budget_json: Json | null
          concept_order_json: Json | null
          course_profile_id: string | null
          created_at: string
          document_id: string | null
          id: string
          mnemonics_json: Json | null
          needs_splitting: boolean | null
          objective: string | null
          pedagogical_contract_json: Json | null
          reasoning_type: string | null
          repetition_plan_json: Json | null
          segments_json: Json | null
          split_modules_json: Json | null
          total_duration_sec: number | null
          visual_anchors_json: Json | null
        }
        Insert: {
          cognitive_budget_json?: Json | null
          concept_order_json?: Json | null
          course_profile_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          mnemonics_json?: Json | null
          needs_splitting?: boolean | null
          objective?: string | null
          pedagogical_contract_json?: Json | null
          reasoning_type?: string | null
          repetition_plan_json?: Json | null
          segments_json?: Json | null
          split_modules_json?: Json | null
          total_duration_sec?: number | null
          visual_anchors_json?: Json | null
        }
        Update: {
          cognitive_budget_json?: Json | null
          concept_order_json?: Json | null
          course_profile_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          mnemonics_json?: Json | null
          needs_splitting?: boolean | null
          objective?: string | null
          pedagogical_contract_json?: Json | null
          reasoning_type?: string | null
          repetition_plan_json?: Json | null
          segments_json?: Json | null
          split_modules_json?: Json | null
          total_duration_sec?: number | null
          visual_anchors_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_architectures_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_architectures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_runs: {
        Row: {
          completed_at: string | null
          completion_status: string
          created_at: string
          debrief_json: Json | null
          difficulty_snapshot_json: Json | null
          id: string
          mission_id: string
          room_events_json: Json | null
          score_composite_json: Json | null
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_status?: string
          created_at?: string
          debrief_json?: Json | null
          difficulty_snapshot_json?: Json | null
          id?: string
          mission_id: string
          room_events_json?: Json | null
          score_composite_json?: Json | null
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_status?: string
          created_at?: string
          debrief_json?: Json | null
          difficulty_snapshot_json?: Json | null
          id?: string
          mission_id?: string
          room_events_json?: Json | null
          score_composite_json?: Json | null
          started_at?: string
          user_id?: string
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
          created_at: string
          document_id: string | null
          event_type: string
          id: string
          mission_id: string | null
          payload_json: Json | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          event_type: string
          id?: string
          mission_id?: string | null
          payload_json?: Json | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          event_type?: string
          id?: string
          mission_id?: string | null
          payload_json?: Json | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_events: {
        Row: {
          anonymous_id: string | null
          created_at: string
          event_name: string
          id: string
          metadata_json: Json | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          metadata_json?: Json | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          metadata_json?: Json | null
          user_id?: string | null
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
        }
        Relationships: []
      }
      prompt_versions: {
        Row: {
          active: boolean | null
          changelog: string | null
          created_at: string
          id: string
          prompt_name: string
          semantic_version: string
        }
        Insert: {
          active?: boolean | null
          changelog?: string | null
          created_at?: string
          id?: string
          prompt_name: string
          semantic_version?: string
        }
        Update: {
          active?: boolean | null
          changelog?: string | null
          created_at?: string
          id?: string
          prompt_name?: string
          semantic_version?: string
        }
        Relationships: []
      }
      provider_health: {
        Row: {
          consecutive_failures: number
          cooldown_seconds: number
          failure_threshold: number
          last_failure_at: string | null
          last_success_at: string | null
          metadata_json: Json | null
          opened_at: string | null
          provider_key: string
          state: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          cooldown_seconds?: number
          failure_threshold?: number
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata_json?: Json | null
          opened_at?: string | null
          provider_key: string
          state?: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          cooldown_seconds?: number
          failure_threshold?: number
          last_failure_at?: string | null
          last_success_at?: string | null
          metadata_json?: Json | null
          opened_at?: string | null
          provider_key?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_routes: {
        Row: {
          capability: string
          config_json: Json | null
          created_at: string
          domain: string
          enabled: boolean | null
          id: string
          priority: number | null
          provider_key: string
        }
        Insert: {
          capability: string
          config_json?: Json | null
          created_at?: string
          domain: string
          enabled?: boolean | null
          id?: string
          priority?: number | null
          provider_key: string
        }
        Update: {
          capability?: string
          config_json?: Json | null
          created_at?: string
          domain?: string
          enabled?: boolean | null
          id?: string
          priority?: number | null
          provider_key?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          config_json: Json | null
          created_at: string
          display_name: string | null
          enabled: boolean | null
          id: string
          provider_key: string
          provider_type: string | null
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          display_name?: string | null
          enabled?: boolean | null
          id?: string
          provider_key: string
          provider_type?: string | null
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          display_name?: string | null
          enabled?: boolean | null
          id?: string
          provider_key?: string
          provider_type?: string | null
        }
        Relationships: []
      }
      publish_decisions: {
        Row: {
          created_at: string
          decided_at: string | null
          decision_status: string | null
          id: string
          qa_report_id: string | null
          reason: string | null
          transformation_id: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decision_status?: string | null
          id?: string
          qa_report_id?: string | null
          reason?: string | null
          transformation_id?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decision_status?: string | null
          id?: string
          qa_report_id?: string | null
          reason?: string | null
          transformation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publish_decisions_qa_report_id_fkey"
            columns: ["qa_report_id"]
            isOneToOne: false
            referencedRelation: "qa_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_decisions_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "transformations"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_reports: {
        Row: {
          block_reason: string | null
          checklist_json: Json | null
          created_at: string
          id: string
          publish_blocked: boolean | null
          qa_score: number | null
          recommendations_json: Json | null
          transformation_id: string | null
          violations_json: Json | null
        }
        Insert: {
          block_reason?: string | null
          checklist_json?: Json | null
          created_at?: string
          id?: string
          publish_blocked?: boolean | null
          qa_score?: number | null
          recommendations_json?: Json | null
          transformation_id?: string | null
          violations_json?: Json | null
        }
        Update: {
          block_reason?: string | null
          checklist_json?: Json | null
          created_at?: string
          id?: string
          publish_blocked?: boolean | null
          qa_score?: number | null
          recommendations_json?: Json | null
          transformation_id?: string | null
          violations_json?: Json | null
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
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          created_at: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      recall_attempts: {
        Row: {
          answers_json: Json | null
          confidence_calibration: number | null
          created_at: string
          grading_json: Json | null
          id: string
          recall_test_id: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          answers_json?: Json | null
          confidence_calibration?: number | null
          created_at?: string
          grading_json?: Json | null
          id?: string
          recall_test_id?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          answers_json?: Json | null
          confidence_calibration?: number | null
          created_at?: string
          grading_json?: Json | null
          id?: string
          recall_test_id?: string | null
          score?: number | null
          user_id?: string
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
          calibration_gap: number | null
          confidence_score: number | null
          created_at: string
          generated_from_version: number | null
          id: string
          mission_run_id: string | null
          questions_json: Json | null
          raw_score: number | null
          results_json: Json | null
          test_type: string
          transformation_id: string | null
          user_id: string | null
        }
        Insert: {
          calibration_gap?: number | null
          confidence_score?: number | null
          created_at?: string
          generated_from_version?: number | null
          id?: string
          mission_run_id?: string | null
          questions_json?: Json | null
          raw_score?: number | null
          results_json?: Json | null
          test_type?: string
          transformation_id?: string | null
          user_id?: string | null
        }
        Update: {
          calibration_gap?: number | null
          confidence_score?: number | null
          created_at?: string
          generated_from_version?: number | null
          id?: string
          mission_run_id?: string | null
          questions_json?: Json | null
          raw_score?: number | null
          results_json?: Json | null
          test_type?: string
          transformation_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recall_tests_mission_run_id_fkey"
            columns: ["mission_run_id"]
            isOneToOne: false
            referencedRelation: "mission_runs"
            referencedColumns: ["id"]
          },
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
          completed_at: string | null
          concept_stable_key: string
          created_at: string
          due_at: string | null
          id: string
          metadata_json: Json | null
          priority: number | null
          review_type: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          concept_stable_key: string
          created_at?: string
          due_at?: string | null
          id?: string
          metadata_json?: Json | null
          priority?: number | null
          review_type?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          concept_stable_key?: string
          created_at?: string
          due_at?: string | null
          id?: string
          metadata_json?: Json | null
          priority?: number | null
          review_type?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_audit_events: {
        Row: {
          created_at: string
          details_json: Json | null
          event_type: string
          id: string
          ip_address: string | null
          ip_hash: string | null
          metadata_json: Json | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details_json?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          metadata_json?: Json | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details_json?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          metadata_json?: Json | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      seed_transformations: {
        Row: {
          created_at: string
          difficulty: string | null
          format: string | null
          id: string
          is_featured: boolean | null
          recall_tests_json: Json | null
          subject: string | null
          title: string | null
          transformation_json: Json | null
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          format?: string | null
          id?: string
          is_featured?: boolean | null
          recall_tests_json?: Json | null
          subject?: string | null
          title?: string | null
          transformation_json?: Json | null
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          format?: string | null
          id?: string
          is_featured?: boolean | null
          recall_tests_json?: Json | null
          subject?: string | null
          title?: string | null
          transformation_json?: Json | null
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
        }
        Relationships: []
      }
      source_documents: {
        Row: {
          content_type: string
          created_at: string
          detailed_source_type: string | null
          detected_language: string | null
          detected_structure: string | null
          id: string
          ingestion_status: string
          original_filename: string | null
          parsed_text_storage_path: string | null
          quality_score: number
          raw_storage_path: string | null
          source_language: string | null
          source_reliability_score: number
          source_type: string
          user_id: string
          warnings_json: Json | null
          word_count: number | null
        }
        Insert: {
          content_type?: string
          created_at?: string
          detailed_source_type?: string | null
          detected_language?: string | null
          detected_structure?: string | null
          id?: string
          ingestion_status?: string
          original_filename?: string | null
          parsed_text_storage_path?: string | null
          quality_score?: number
          raw_storage_path?: string | null
          source_language?: string | null
          source_reliability_score?: number
          source_type?: string
          user_id: string
          warnings_json?: Json | null
          word_count?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string
          detailed_source_type?: string | null
          detected_language?: string | null
          detected_structure?: string | null
          id?: string
          ingestion_status?: string
          original_filename?: string | null
          parsed_text_storage_path?: string | null
          quality_score?: number
          raw_storage_path?: string | null
          source_language?: string | null
          source_reliability_score?: number
          source_type?: string
          user_id?: string
          warnings_json?: Json | null
          word_count?: number | null
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
      suspicious_activity_flags: {
        Row: {
          created_at: string
          details_json: Json | null
          flag_type: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details_json?: Json | null
          flag_type: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details_json?: Json | null
          flag_type?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transformations: {
        Row: {
          content_json: Json | null
          course_profile_id: string | null
          coverage_json: Json | null
          created_at: string
          document_id: string | null
          estimated_duration_sec: number | null
          format: string | null
          format_decision_id: string | null
          generation_flags_json: Json | null
          id: string
          internal_summary_json: Json | null
          memory_architecture_id: string | null
          published_status: string | null
          qa_status: string | null
          recall_tests_json: Json | null
          source_disclaimer_json: Json | null
          title: string | null
          transformation_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_json?: Json | null
          course_profile_id?: string | null
          coverage_json?: Json | null
          created_at?: string
          document_id?: string | null
          estimated_duration_sec?: number | null
          format?: string | null
          format_decision_id?: string | null
          generation_flags_json?: Json | null
          id?: string
          internal_summary_json?: Json | null
          memory_architecture_id?: string | null
          published_status?: string | null
          qa_status?: string | null
          recall_tests_json?: Json | null
          source_disclaimer_json?: Json | null
          title?: string | null
          transformation_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_json?: Json | null
          course_profile_id?: string | null
          coverage_json?: Json | null
          created_at?: string
          document_id?: string | null
          estimated_duration_sec?: number | null
          format?: string | null
          format_decision_id?: string | null
          generation_flags_json?: Json | null
          id?: string
          internal_summary_json?: Json | null
          memory_architecture_id?: string | null
          published_status?: string | null
          qa_status?: string | null
          recall_tests_json?: Json | null
          source_disclaimer_json?: Json | null
          title?: string | null
          transformation_json?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transformations_course_profile_id_fkey"
            columns: ["course_profile_id"]
            isOneToOne: false
            referencedRelation: "course_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformations_format_decision_id_fkey"
            columns: ["format_decision_id"]
            isOneToOne: false
            referencedRelation: "format_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transformations_memory_architecture_id_fkey"
            columns: ["memory_architecture_id"]
            isOneToOne: false
            referencedRelation: "memory_architectures"
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
          billing_period_end: string | null
          billing_period_start: string
          counters_json: Json | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string
          counters_json?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string
          counters_json?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credit_balances: {
        Row: {
          balance: number
          created_at: string
          credit_type: string | null
          expires_at: string | null
          id: string
          lifetime_earned: number | null
          lifetime_spent: number | null
          remaining: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          credit_type?: string | null
          expires_at?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_spent?: number | null
          remaining?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          credit_type?: string | null
          expires_at?: string | null
          id?: string
          lifetime_earned?: number | null
          lifetime_spent?: number | null
          remaining?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_guardians: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          relationship: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          relationship?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          relationship?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_minor_profiles: {
        Row: {
          birth_year: number | null
          created_at: string
          guardian_verified: boolean | null
          id: string
          is_minor: boolean | null
          metadata_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          guardian_verified?: boolean | null
          id?: string
          is_minor?: boolean | null
          metadata_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          guardian_verified?: boolean | null
          id?: string
          is_minor?: boolean | null
          metadata_json?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_usage_profiles: {
        Row: {
          created_at: string
          dominant_usage_profile: string | null
          feature_distribution_json: Json | null
          id: string
          metadata_json: Json | null
          rolling_30d_usage_json: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dominant_usage_profile?: string | null
          feature_distribution_json?: Json | null
          id?: string
          metadata_json?: Json | null
          rolling_30d_usage_json?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dominant_usage_profile?: string | null
          feature_distribution_json?: Json | null
          id?: string
          metadata_json?: Json | null
          rolling_30d_usage_json?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_assets: {
        Row: {
          asset_type: string | null
          created_at: string
          id: string
          metadata_json: Json | null
          project_id: string | null
          status: string | null
          storage_path: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          asset_type?: string | null
          created_at?: string
          id?: string
          metadata_json?: Json | null
          project_id?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          asset_type?: string | null
          created_at?: string
          id?: string
          metadata_json?: Json | null
          project_id?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      video_generation_plans: {
        Row: {
          created_at: string
          id: string
          plan_json: Json | null
          project_id: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          plan_json?: Json | null
          project_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          plan_json?: Json | null
          project_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      video_projects: {
        Row: {
          config_json: Json | null
          created_at: string
          description: string | null
          id: string
          output_url: string | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          output_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          output_url?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_provider_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_json: Json | null
          output_json: Json | null
          project_id: string | null
          provider_key: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          project_id?: string | null
          provider_key?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          project_id?: string | null
          provider_key?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          external_event_id: string | null
          id: string
          payload_json: Json | null
          processed_at: string | null
          provider_key: string
          status: string | null
        }
        Insert: {
          created_at?: string
          external_event_id?: string | null
          id?: string
          payload_json?: Json | null
          processed_at?: string | null
          provider_key: string
          status?: string | null
        }
        Update: {
          created_at?: string
          external_event_id?: string | null
          id?: string
          payload_json?: Json | null
          processed_at?: string | null
          provider_key?: string
          status?: string | null
        }
        Relationships: []
      }
      webhook_replay_protection: {
        Row: {
          created_at: string
          external_event_id: string
          id: string
          provider_key: string
        }
        Insert: {
          created_at?: string
          external_event_id: string
          id?: string
          provider_key: string
        }
        Update: {
          created_at?: string
          external_event_id?: string
          id?: string
          provider_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      guardians_safe: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string | null
          invite_expires_at: string | null
          invite_used_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          invite_expires_at?: string | null
          invite_used_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          invite_expires_at?: string | null
          invite_used_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_consume_rate_limit: {
        Args: {
          p_bucket_key: string
          p_max_requests: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: Json
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      consume_feature_quota: {
        Args: {
          p_feature_key: string
          p_limit: number
          p_period_days?: number
          p_user_id: string
        }
        Returns: Json
      }
      get_feature_quota_usage: {
        Args: { p_feature_key: string; p_user_id: string }
        Returns: Json
      }
      get_leaderboard: {
        Args: { p_week?: string }
        Returns: {
          avatar_url: string
          display_name: string
          total_points: number
          week: string
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_quota_atomic: {
        Args: { p_limit: number; p_month: string; p_user_id: string }
        Returns: Json
      }
      is_provider_healthy: { Args: { p_provider_key: string }; Returns: Json }
      record_provider_failure: {
        Args: { p_provider_key: string }
        Returns: Json
      }
      record_provider_success: {
        Args: { p_provider_key: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
