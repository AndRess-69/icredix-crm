import type {
  BlockStatus,
  ClientValidationStatus,
  CreditStatus,
  DeviceStatus,
  InstallmentStatus,
  PaymentMethod,
  UserRole,
} from "./enums";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      company_settings: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          telegram_token: string | null;
          telegram_chat_id: string | null;
          interest_rate: number;
          google_sheet_id: string | null;
          google_service_account_json: string | null;
          google_script_url: string | null;
          google_script_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          telegram_token?: string | null;
          telegram_chat_id?: string | null;
          interest_rate?: number;
          google_sheet_id?: string | null;
          google_service_account_json?: string | null;
          google_script_url?: string | null;
          google_script_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          telegram_token?: string | null;
          telegram_chat_id?: string | null;
          interest_rate?: number;
          google_sheet_id?: string | null;
          google_service_account_json?: string | null;
          google_script_url?: string | null;
          google_script_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          cedula: string;
          phone: string;
          email: string | null;
          address: string | null;
          city: string | null;
          birth_date: string | null;
          notes: string | null;
          validation_status: ClientValidationStatus;
          request_date: string | null;
          approval_date: string | null;
          validation_result: string | null;
          validation_notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          cedula: string;
          phone: string;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          birth_date?: string | null;
          notes?: string | null;
          validation_status?: ClientValidationStatus;
          request_date?: string | null;
          approval_date?: string | null;
          validation_result?: string | null;
          validation_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          cedula?: string;
          phone?: string;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          birth_date?: string | null;
          notes?: string | null;
          validation_status?: ClientValidationStatus;
          request_date?: string | null;
          approval_date?: string | null;
          validation_result?: string | null;
          validation_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      client_documents: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          file_url: string;
          file_type: string | null;
          doc_type: string | null;
          notes: string | null;
          created_by: string | null;
          credit_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          file_url: string;
          file_type?: string | null;
          doc_type?: string | null;
          notes?: string | null;
          created_by?: string | null;
          credit_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          file_url?: string;
          file_type?: string | null;
          doc_type?: string | null;
          notes?: string | null;
          created_by?: string | null;
          credit_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "client_documents_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "client_documents_credit_id_fkey",
            columns: ["credit_id"],
            isOneToOne: false,
            referencedRelation: "credits",
            referencedColumns: ["id"],
          },
        ];
      };
      devices: {
        Row: {
          id: string;
          brand: string;
          model: string;
          capacity: string | null;
          color: string | null;
          imei: string | null;
          imei2: string | null;
          purchase_date: string | null;
          delivery_date: string | null;
          status: DeviceStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          brand?: string;
          model: string;
          capacity?: string | null;
          color?: string | null;
          imei?: string | null;
          imei2?: string | null;
          purchase_date?: string | null;
          delivery_date?: string | null;
          status?: DeviceStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          brand?: string;
          model?: string;
          capacity?: string | null;
          color?: string | null;
          imei?: string | null;
          imei2?: string | null;
          purchase_date?: string | null;
          delivery_date?: string | null;
          status?: DeviceStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      device_references: {
        Row: {
          id: string;
          brand: string;
          model: string;
          capacity: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          brand?: string;
          model: string;
          capacity?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          brand?: string;
          model?: string;
          capacity?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      credits: {
        Row: {
          id: string;
          credit_number: string;
          client_id: string;
          device_id: string | null;
          device_reference_id: string | null;
          imei: string | null;
          device_value: number;
          financed_amount: number;
          initial_payment: number;
          balance: number;
          installments_count: number;
          installment_amount: number;
          interest_rate: number;
          start_date: string;
          end_date: string;
          approval_date: string | null;
          status: CreditStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          credit_number: string;
          client_id: string;
          device_id?: string | null;
          device_reference_id?: string | null;
          imei?: string | null;
          device_value?: number;
          financed_amount: number;
          initial_payment?: number;
          balance: number;
          installments_count: number;
          installment_amount: number;
          interest_rate?: number;
          start_date: string;
          end_date: string;
          approval_date?: string | null;
          status?: CreditStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          credit_number?: string;
          client_id?: string;
          device_id?: string | null;
          device_reference_id?: string | null;
          imei?: string | null;
          device_value?: number;
          financed_amount?: number;
          initial_payment?: number;
          balance?: number;
          installments_count?: number;
          installment_amount?: number;
          interest_rate?: number;
          start_date?: string;
          end_date?: string;
          approval_date?: string | null;
          status?: CreditStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credits_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "credits_device_id_fkey",
            columns: ["device_id"],
            isOneToOne: false,
            referencedRelation: "devices",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "credits_device_reference_id_fkey",
            columns: ["device_reference_id"],
            isOneToOne: false,
            referencedRelation: "device_references",
            referencedColumns: ["id"],
          },
        ];
      };
      installments: {
        Row: {
          id: string;
          credit_id: string;
          number: number;
          due_date: string;
          amount: number;
          status: InstallmentStatus;
          paid_at: string | null;
          days_overdue: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          credit_id: string;
          number: number;
          due_date: string;
          amount: number;
          status?: InstallmentStatus;
          paid_at?: string | null;
          days_overdue?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          credit_id?: string;
          number?: number;
          due_date?: string;
          amount?: number;
          status?: InstallmentStatus;
          paid_at?: string | null;
          days_overdue?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "installments_credit_id_fkey",
            columns: ["credit_id"],
            isOneToOne: false,
            referencedRelation: "credits",
            referencedColumns: ["id"],
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          client_id: string;
          credit_id: string;
          installment_id: string | null;
          amount: number;
          method: PaymentMethod;
          reference: string | null;
          receipt_url: string | null;
          notes: string | null;
          created_by: string | null;
          transferred_to_installment_id: string | null;
          is_partial: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          credit_id: string;
          installment_id?: string | null;
          amount: number;
          method?: PaymentMethod;
          reference?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          credit_id?: string;
          installment_id?: string | null;
          amount?: number;
          method?: PaymentMethod;
          reference?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          created_by?: string | null;
          transferred_to_installment_id?: string | null;
          is_partial?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "payments_credit_id_fkey",
            columns: ["credit_id"],
            isOneToOne: false,
            referencedRelation: "credits",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "payments_installment_id_fkey",
            columns: ["installment_id"],
            isOneToOne: false,
            referencedRelation: "installments",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "payments_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ];
      };
      blocks: {
        Row: {
          id: string;
          block_date: string;
          client_id: string;
          imei: string;
          reason: string;
          user_id: string | null;
          status: BlockStatus;
          phone_line: string | null;
          diagnoses: string | null;
          credit_id: string | null;
          device_id: string | null;
          blocked_by: string | null;
          encargo_bloqueos_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          block_date?: string;
          client_id: string;
          imei: string;
          reason: string;
          user_id?: string | null;
          status?: BlockStatus;
          phone_line?: string | null;
          diagnoses?: string | null;
          credit_id?: string | null;
          device_id?: string | null;
          blocked_by?: string | null;
          encargo_bloqueos_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          block_date?: string;
          client_id?: string;
          imei?: string;
          reason?: string;
          user_id?: string | null;
          status?: BlockStatus;
          phone_line?: string | null;
          diagnoses?: string | null;
          credit_id?: string | null;
          device_id?: string | null;
          blocked_by?: string | null;
          encargo_bloqueos_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "blocks_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "blocks_credit_id_fkey",
            columns: ["credit_id"],
            isOneToOne: false,
            referencedRelation: "credits",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "blocks_device_id_fkey",
            columns: ["device_id"],
            isOneToOne: false,
            referencedRelation: "devices",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "blocks_blocked_by_fkey",
            columns: ["blocked_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ];
      };
      unblocks: {
        Row: {
          id: string;
          unblock_date: string;
          client_id: string;
          imei: string;
          payment_id: string | null;
          user_id: string | null;
          status: BlockStatus;
          unblock_reason: string | null;
          phone_line: string | null;
          diagnoses: string | null;
          credit_id: string | null;
          device_id: string | null;
          blocked_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unblock_date?: string;
          client_id: string;
          imei: string;
          payment_id?: string | null;
          user_id?: string | null;
          status?: BlockStatus;
          unblock_reason?: string | null;
          phone_line?: string | null;
          diagnoses?: string | null;
          credit_id?: string | null;
          device_id?: string | null;
          blocked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          unblock_date?: string;
          client_id?: string;
          imei?: string;
          payment_id?: string | null;
          user_id?: string | null;
          status?: BlockStatus;
          unblock_reason?: string | null;
          phone_line?: string | null;
          diagnoses?: string | null;
          credit_id?: string | null;
          device_id?: string | null;
          blocked_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unblocks_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "unblocks_payment_id_fkey",
            columns: ["payment_id"],
            isOneToOne: false,
            referencedRelation: "payments",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "unblocks_user_id_fkey",
            columns: ["user_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "unblocks_credit_id_fkey",
            columns: ["credit_id"],
            isOneToOne: false,
            referencedRelation: "credits",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "unblocks_device_id_fkey",
            columns: ["device_id"],
            isOneToOne: false,
            referencedRelation: "devices",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "unblocks_blocked_by_fkey",
            columns: ["blocked_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ];
      };
      unblock_responses: {
        Row: {
          id: string;
          unblock_id: string;
          response_type: string;
          message: string | null;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unblock_id: string;
          response_type: string;
          message?: string | null;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          unblock_id?: string;
          response_type?: string;
          message?: string | null;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unblock_responses_unblock_id_fkey",
            columns: ["unblock_id"],
            isOneToOne: false,
            referencedRelation: "unblocks",
            referencedColumns: ["id"],
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          file_url: string;
          file_type: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          file_url: string;
          file_type?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          file_url?: string;
          file_type?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ];
      };
      credit_documents: {
        Row: {
          id: string;
          credit_id: string;
          client_id: string;
          name: string;
          file_url: string;
          file_type: string | null;
          created_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          credit_id: string;
          client_id: string;
          name: string;
          file_url: string;
          file_type?: string | null;
          created_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          credit_id?: string;
          client_id?: string;
          name?: string;
          file_url?: string;
          file_type?: string | null;
          created_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credit_documents_credit_id_fkey",
            columns: ["credit_id"],
            isOneToOne: false,
            referencedRelation: "credits",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "credit_documents_client_id_fkey",
            columns: ["client_id"],
            isOneToOne: false,
            referencedRelation: "clients",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "credit_documents_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ];
      };
      document_records: {
        Row: {
          id: string;
          doc_key: string;
          client_name: string;
          cedula: string;
          data: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          doc_key: string;
          client_name: string;
          cedula?: string;
          data?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          doc_key?: string;
          client_name?: string;
          cedula?: string;
          data?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "document_records_created_by_fkey",
            columns: ["created_by"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_credit: {
        Args: {
          p_client_id: string;
          p_device_id: string | null;
          p_imei: string | null;
          p_financed_amount: number;
          p_initial_payment: number;
          p_installments_count: number;
          p_start_date: string;
          p_interest_rate?: number;
          p_device_value?: number;
          p_device_reference_id?: string | null;
        };
        Returns: void;
      };
      update_credit: {
        Args: {
          p_credit_id: string;
          p_client_id: string;
          p_device_id: string | null;
          p_imei: string | null;
          p_financed_amount: number;
          p_initial_payment: number;
          p_installments_count: number;
          p_start_date: string;
          p_interest_rate?: number;
          p_device_value?: number;
          p_device_reference_id?: string | null;
        };
        Returns: void;
      };
      create_device_reference: {
        Args: {
          p_brand: string;
          p_model: string;
          p_capacity?: string;
          p_color?: string;
        };
        Returns: {
          id: string;
          brand: string;
          model: string;
          capacity: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
      };
      update_device_reference: {
        Args: {
          p_id: string;
          p_brand: string;
          p_model: string;
          p_capacity?: string;
          p_color?: string;
        };
        Returns: {
          id: string;
          brand: string;
          model: string;
          capacity: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
      };
      delete_device_reference: {
        Args: {
          p_id: string;
        };
        Returns: void;
      };
      create_payment: {
        Args: {
          p_credit_id: string;
          p_installment_id: string;
          p_method: string;
          p_reference: string | null;
          p_notes: string | null;
          p_amount?: number | null;
        };
        Returns: void;
      };
      delete_payment: {
        Args: {
          p_payment_id: string;
        };
        Returns: void;
      };
      create_block: {
        Args: {
          p_client_id: string;
          p_imei: string;
          p_reason: string;
          p_phone_line?: string | null;
          p_diagnoses?: string | null;
          p_credit_id?: string | null;
          p_device_id?: string | null;
          p_encargo_bloqueos_json?: Json | null;
        };
        Returns: string;
      };
      update_block_status: {
        Args: {
          p_block_id: string;
          p_status: BlockStatus;
        };
        Returns: string;
      };
      create_unblock: {
        Args: {
          p_client_id: string;
          p_imei: string;
          p_payment_id?: string | null;
          p_unblock_reason?: string | null;
          p_phone_line?: string | null;
          p_diagnoses?: string | null;
          p_credit_id?: string | null;
          p_device_id?: string | null;
        };
        Returns: string;
      };
      update_unblock_status: {
        Args: {
          p_unblock_id: string;
          p_status: BlockStatus;
        };
        Returns: string;
      };
      refresh_overdue_installments: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      get_company_settings_public: {
        Args: Record<string, never>;
        Returns: Json;
      };
      recompute_credit_status: {
        Args: {
          p_credit_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      device_status: DeviceStatus;
      credit_status: CreditStatus;
      installment_status: InstallmentStatus;
      payment_method: PaymentMethod;
      block_status: BlockStatus;
      client_validation_status: ClientValidationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
