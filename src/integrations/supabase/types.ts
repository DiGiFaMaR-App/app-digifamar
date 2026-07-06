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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          outcome: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          outcome?: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          outcome?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      buyer_profiles: {
        Row: {
          address: string | null
          contactless: boolean
          created_at: string
          delivery_frequency: string | null
          delivery_window: string | null
          notes: string | null
          sms_updates: boolean
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          contactless?: boolean
          created_at?: string
          delivery_frequency?: string | null
          delivery_window?: string | null
          notes?: string | null
          sms_updates?: boolean
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          contactless?: boolean
          created_at?: string
          delivery_frequency?: string | null
          delivery_window?: string | null
          notes?: string | null
          sms_updates?: boolean
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          farm_name: string | null
          farmer_id: string
          id: string
          last_message_at: string
          product_id: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          farm_name?: string | null
          farmer_id: string
          id?: string
          last_message_at?: string
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          farm_name?: string | null
          farmer_id?: string
          id?: string
          last_message_at?: string
          product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_confirmations: {
        Row: {
          attempts: number
          confirmed_at: string | null
          created_at: string
          id: string
          order_id: string
          otp_expires_at: string
          otp_hash: string
        }
        Insert: {
          attempts?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          order_id: string
          otp_expires_at: string
          otp_hash: string
        }
        Update: {
          attempts?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string
          otp_expires_at?: string
          otp_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_confirmations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          evidence_urls: string[]
          id: string
          order_id: string
          raised_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_urls?: string[]
          id?: string
          order_id: string
          raised_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_urls?: string[]
          id?: string
          order_id?: string
          raised_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_ledger: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          created_at: string
          entry_type: string
          id: string
          notes: string | null
          order_id: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          created_at?: string
          entry_type: string
          id?: string
          notes?: string | null
          order_id: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string
          entry_type?: string
          id?: string
          notes?: string | null
          order_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_lender_recommendations: {
        Row: {
          avg_rating: number
          created_at: string
          farmer_id: string
          id: string
          lender_id: string | null
          reason: string | null
          recommended_amount: number
          repeat_buyer_pct: number
          trade_score: number
          twelve_month_sales: number
          updated_at: string
        }
        Insert: {
          avg_rating?: number
          created_at?: string
          farmer_id: string
          id?: string
          lender_id?: string | null
          reason?: string | null
          recommended_amount?: number
          repeat_buyer_pct?: number
          trade_score?: number
          twelve_month_sales?: number
          updated_at?: string
        }
        Update: {
          avg_rating?: number
          created_at?: string
          farmer_id?: string
          id?: string
          lender_id?: string | null
          reason?: string | null
          recommended_amount?: number
          repeat_buyer_pct?: number
          trade_score?: number
          twelve_month_sales?: number
          updated_at?: string
        }
        Relationships: []
      }
      farmer_profiles: {
        Row: {
          acres: number | null
          address: string | null
          certifications: string[]
          city: string | null
          created_at: string
          description: string | null
          farm_name: string
          lat: number | null
          lng: number | null
          products: string[]
          state: string | null
          updated_at: string
          user_id: string
          verification_status: string
          years_farming: number | null
          zip: string | null
        }
        Insert: {
          acres?: number | null
          address?: string | null
          certifications?: string[]
          city?: string | null
          created_at?: string
          description?: string | null
          farm_name: string
          lat?: number | null
          lng?: number | null
          products?: string[]
          state?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
          years_farming?: number | null
          zip?: string | null
        }
        Update: {
          acres?: number | null
          address?: string | null
          certifications?: string[]
          city?: string | null
          created_at?: string
          description?: string | null
          farm_name?: string
          lat?: number | null
          lng?: number | null
          products?: string[]
          state?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
          years_farming?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      inspection_windows: {
        Row: {
          auto_release_at: string
          closes_at: string
          created_at: string
          id: string
          opens_at: string
          order_id: string
          released_at: string | null
        }
        Insert: {
          auto_release_at: string
          closes_at: string
          created_at?: string
          id?: string
          opens_at?: string
          order_id: string
          released_at?: string | null
        }
        Update: {
          auto_release_at?: string
          closes_at?: string
          created_at?: string
          id?: string
          opens_at?: string
          order_id?: string
          released_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_windows_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lender_applications: {
        Row: {
          charter_number: string | null
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          institution_name: string
          institution_type: string
          lending_states: string[]
          max_loan_amount: number
          min_loan_amount: number
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          charter_number?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          institution_name: string
          institution_type: string
          lending_states?: string[]
          max_loan_amount?: number
          min_loan_amount?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          charter_number?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          institution_name?: string
          institution_type?: string
          lending_states?: string[]
          max_loan_amount?: number
          min_loan_amount?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lender_profiles: {
        Row: {
          application_id: string | null
          charter_number: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          institution_name: string
          institution_type: string
          lending_states: string[]
          max_loan_amount: number
          min_loan_amount: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          charter_number?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          institution_name: string
          institution_type: string
          lending_states?: string[]
          max_loan_amount?: number
          min_loan_amount?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          charter_number?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          institution_name?: string
          institution_type?: string
          lending_states?: string[]
          max_loan_amount?: number
          min_loan_amount?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lender_profiles_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "lender_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          farmer_id: string
          id: string
          images: string[]
          lat: number | null
          lng: number | null
          price_cents: number
          qty_available: number
          slug: string
          status: string
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          farmer_id: string
          id?: string
          images?: string[]
          lat?: number | null
          lng?: number | null
          price_cents: number
          qty_available?: number
          slug: string
          status?: string
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          farmer_id?: string
          id?: string
          images?: string[]
          lat?: number | null
          lng?: number | null
          price_cents?: number
          qty_available?: number
          slug?: string
          status?: string
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          flagged: boolean
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          flagged?: boolean
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          flagged?: boolean
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          order_id: string
          payload: Json
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          payload?: Json
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          delivery_deadline: string | null
          escrow_fee_cents: number
          farmer_id: string
          id: string
          listing_id: string
          notes: string | null
          platform_fee_cents: number
          qty: number
          release_code_hash: string | null
          shipping_address: string | null
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          delivery_deadline?: string | null
          escrow_fee_cents?: number
          farmer_id: string
          id?: string
          listing_id: string
          notes?: string | null
          platform_fee_cents?: number
          qty: number
          release_code_hash?: string | null
          shipping_address?: string | null
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          delivery_deadline?: string | null
          escrow_fee_cents?: number
          farmer_id?: string
          id?: string
          listing_id?: string
          notes?: string | null
          platform_fee_cents?: number
          qty?: number
          release_code_hash?: string | null
          shipping_address?: string | null
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          buyer_id: string
          created_at: string
          farmer_id: string
          id: string
          order_id: string
          rating: number
        }
        Insert: {
          body?: string | null
          buyer_id: string
          created_at?: string
          farmer_id: string
          id?: string
          order_id: string
          rating: number
        }
        Update: {
          body?: string | null
          buyer_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
          order_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      wallets: {
        Row: {
          available_balance_cents: number
          created_at: string
          held_balance_cents: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance_cents?: number
          created_at?: string
          held_balance_cents?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance_cents?: number
          created_at?: string
          held_balance_cents?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "farmer" | "buyer" | "lender"
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
      app_role: ["admin", "farmer", "buyer", "lender"],
    },
  },
} as const
