export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          class: string | null;
          created_at: string;
          district: string | null;
          event_type: string;
          id: string;
          metadata: Json | null;
          school_name: string | null;
          user_id: string | null;
          user_name: string | null;
        };
        Insert: {
          class?: string | null;
          created_at?: string;
          district?: string | null;
          event_type: string;
          id?: string;
          metadata?: Json | null;
          school_name?: string | null;
          user_id?: string | null;
          user_name?: string | null;
        };
        Update: {
          class?: string | null;
          created_at?: string;
          district?: string | null;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
          school_name?: string | null;
          user_id?: string | null;
          user_name?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: {
          created_at: string;
          description: string | null;
          district: string | null;
          event_date: string;
          event_time: string | null;
          id: string;
          registration_url: string | null;
          target_class: string | null;
          title: string;
          title_ta: string | null;
          venue: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          district?: string | null;
          event_date: string;
          event_time?: string | null;
          id?: string;
          registration_url?: string | null;
          target_class?: string | null;
          title: string;
          title_ta?: string | null;
          venue?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          district?: string | null;
          event_date?: string;
          event_time?: string | null;
          id?: string;
          registration_url?: string | null;
          target_class?: string | null;
          title?: string;
          title_ta?: string | null;
          venue?: string | null;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          category: string;
          created_at: string;
          district: string | null;
          id: string;
          message: string;
          response: string | null;
          status: string;
          student_id: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          district?: string | null;
          id?: string;
          message: string;
          response?: string | null;
          status?: string;
          student_id?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          district?: string | null;
          id?: string;
          message?: string;
          response?: string | null;
          status?: string;
          student_id?: string | null;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          chapter: string | null;
          class: string;
          created_at: string;
          created_by: string | null;
          id: string;
          language: string;
          source: string | null;
          subject: string;
          subject_ta: string | null;
          title: string;
          title_ta: string | null;
          type: string;
          url: string;
        };
        Insert: {
          chapter?: string | null;
          class: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          language?: string;
          source?: string | null;
          subject: string;
          subject_ta?: string | null;
          title: string;
          title_ta?: string | null;
          type: string;
          url: string;
        };
        Update: {
          chapter?: string | null;
          class?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          language?: string;
          source?: string | null;
          subject?: string;
          subject_ta?: string | null;
          title?: string;
          title_ta?: string | null;
          type?: string;
          url?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          message: string;
          target_type: string;
          target_value: string | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message: string;
          target_type?: string;
          target_value?: string | null;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          message?: string;
          target_type?: string;
          target_value?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          class: string | null;
          created_at: string;
          district: string | null;
          email: string | null;
          emis_number: string | null;
          full_name: string;
          id: string;
          language_preference: string;
          mobile_number: string | null;
          location_label: string | null;
          location_latitude: number | null;
          location_longitude: number | null;
          location_place_id: string | null;
          school_name: string | null;
          section: string | null;
          subject: string | null;
          updated_at: string;
        };
        Insert: {
          class?: string | null;
          created_at?: string;
          district?: string | null;
          email?: string | null;
          emis_number?: string | null;
          full_name: string;
          id: string;
          language_preference?: string;
          mobile_number?: string | null;
          location_label?: string | null;
          location_latitude?: number | null;
          location_longitude?: number | null;
          location_place_id?: string | null;
          school_name?: string | null;
          section?: string | null;
          subject?: string | null;
          updated_at?: string;
        };
        Update: {
          class?: string | null;
          created_at?: string;
          district?: string | null;
          email?: string | null;
          emis_number?: string | null;
          full_name?: string;
          id?: string;
          language_preference?: string;
          mobile_number?: string | null;
          location_label?: string | null;
          location_latitude?: number | null;
          location_longitude?: number | null;
          location_place_id?: string | null;
          school_name?: string | null;
          section?: string | null;
          subject?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_signups: {
        Row: {
          class: string;
          created_at: string;
          district: string;
          full_name: string;
          id: string;
          location_label: string | null;
          location_latitude: number | null;
          location_longitude: number | null;
          location_place_id: string | null;
          mobile_number: string;
          school_name: string;
          section: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          class: string;
          created_at?: string;
          district: string;
          full_name: string;
          id?: string;
          location_label?: string | null;
          location_latitude?: number | null;
          location_longitude?: number | null;
          location_place_id?: string | null;
          mobile_number: string;
          school_name: string;
          section?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          class?: string;
          created_at?: string;
          district?: string;
          full_name?: string;
          id?: string;
          location_label?: string | null;
          location_latitude?: number | null;
          location_longitude?: number | null;
          location_place_id?: string | null;
          mobile_number?: string;
          school_name?: string;
          section?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      schools: {
        Row: {
          created_at: string;
          district: string;
          id: string;
          name: string;
          type: string | null;
        };
        Insert: {
          created_at?: string;
          district: string;
          id?: string;
          name: string;
          type?: string | null;
        };
        Update: {
          created_at?: string;
          district?: string;
          id?: string;
          name?: string;
          type?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          district: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          district?: string | null;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          district?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          chapter: string | null;
          class: string;
          created_at: string;
          created_by: string | null;
          duration_minutes: number | null;
          id: string;
          source: string | null;
          subject: string;
          subject_ta: string | null;
          thumbnail_url: string | null;
          title: string;
          title_ta: string | null;
          url: string;
        };
        Insert: {
          chapter?: string | null;
          class: string;
          created_at?: string;
          created_by?: string | null;
          duration_minutes?: number | null;
          id?: string;
          source?: string | null;
          subject: string;
          subject_ta?: string | null;
          thumbnail_url?: string | null;
          title: string;
          title_ta?: string | null;
          url: string;
        };
        Update: {
          chapter?: string | null;
          class?: string;
          created_at?: string;
          created_by?: string | null;
          duration_minutes?: number | null;
          id?: string;
          source?: string | null;
          subject?: string;
          subject_ta?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          title_ta?: string | null;
          url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_district: { Args: { _user_id: string }; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "student" | "teacher" | "district_admin" | "super_admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher", "district_admin", "super_admin"],
    },
  },
} as const;
