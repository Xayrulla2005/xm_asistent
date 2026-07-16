--
-- PostgreSQL database dump
--

\restrict NNiuNagLxlfXdoTgEcYBqpQL5c80Wg1ym8yq2kdSQcCldom5jfrlCiIXTqj569h

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: branch_transfers_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.branch_transfers_status_enum AS ENUM (
    'pending',
    'completed',
    'cancelled'
);


--
-- Name: bugs_priority_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bugs_priority_enum AS ENUM (
    'P1',
    'P2',
    'P3',
    'P4'
);


--
-- Name: bugs_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bugs_status_enum AS ENUM (
    'new',
    'open',
    'in_progress',
    'testing',
    'resolved',
    'closed',
    'reopened'
);


--
-- Name: bugs_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bugs_type_enum AS ENUM (
    'frontend_error',
    'api_error',
    'user_report'
);


--
-- Name: debts_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.debts_status_enum AS ENUM (
    'pending',
    'partial',
    'paid',
    'cancelled'
);


--
-- Name: generated_crms_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.generated_crms_status_enum AS ENUM (
    'active',
    'outdated'
);


--
-- Name: inventory_movements_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_movements_type_enum AS ENUM (
    'sale',
    'return',
    'restock',
    'adjustment'
);


--
-- Name: payment_history_method_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_history_method_enum AS ENUM (
    'click',
    'payme',
    'manual'
);


--
-- Name: payment_history_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_history_status_enum AS ENUM (
    'pending',
    'success',
    'failed'
);


--
-- Name: payments_method_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payments_method_enum AS ENUM (
    'cash',
    'card',
    'credit'
);


--
-- Name: payments_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payments_status_enum AS ENUM (
    'pending',
    'completed',
    'cancelled'
);


--
-- Name: payments_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payments_type_enum AS ENUM (
    'income',
    'expense'
);


--
-- Name: sale_returns_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_returns_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: sales_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sales_status_enum AS ENUM (
    'pending',
    'completed',
    'cancelled'
);


--
-- Name: subscriptions_billingcycle_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscriptions_billingcycle_enum AS ENUM (
    'monthly',
    'yearly'
);


--
-- Name: subscriptions_paymentmethod_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscriptions_paymentmethod_enum AS ENUM (
    'click',
    'payme',
    'manual'
);


--
-- Name: subscriptions_pendingcycle_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscriptions_pendingcycle_enum AS ENUM (
    'monthly',
    'yearly'
);


--
-- Name: subscriptions_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscriptions_status_enum AS ENUM (
    'active',
    'trial',
    'suspended',
    'cancelled'
);


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_role_enum AS ENUM (
    'admin',
    'manager',
    'user',
    'superadmin'
);


--
-- Name: warehouse_logs_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.warehouse_logs_type_enum AS ENUM (
    'income',
    'expense'
);


--
-- Name: wizard_configs_currency_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wizard_configs_currency_enum AS ENUM (
    'uzs',
    'usd',
    'rub'
);


--
-- Name: wizard_configs_discountmode_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wizard_configs_discountmode_enum AS ENUM (
    'classic',
    'markup',
    'mixed'
);


--
-- Name: wizard_configs_industry_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wizard_configs_industry_enum AS ENUM (
    'retail',
    'clinic',
    'education',
    'restaurant',
    'beauty',
    'fitness',
    'auto',
    'construction',
    'custom'
);


--
-- Name: wizard_configs_language_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wizard_configs_language_enum AS ENUM (
    'uz',
    'ru',
    'en'
);


--
-- Name: wizard_configs_receiptsize_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wizard_configs_receiptsize_enum AS ENUM (
    '58mm',
    '80mm',
    'a4'
);


--
-- Name: wizard_configs_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wizard_configs_status_enum AS ENUM (
    'draft',
    'active'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    title character varying NOT NULL,
    body text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying,
    "tenantName" character varying,
    action character varying NOT NULL,
    entity character varying,
    "entityId" character varying,
    "entityLabel" character varying,
    "actorEmail" character varying,
    "actorRole" character varying,
    "ipAddress" character varying,
    before jsonb,
    after jsonb,
    meta jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: auto_service_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_service_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "vehicleId" uuid,
    "plateNumber" character varying,
    "vehicleInfo" character varying,
    "customerId" uuid,
    "customerName" character varying NOT NULL,
    "customerPhone" character varying,
    description text NOT NULL,
    mechanics jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying DEFAULT 'received'::character varying NOT NULL,
    "workItems" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "totalCost" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "receivedAt" date DEFAULT ('now'::text)::date NOT NULL,
    "estimatedAt" date,
    "completedAt" date,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: auto_vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_vehicles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "customerId" uuid,
    "customerName" character varying NOT NULL,
    "customerPhone" character varying,
    brand character varying NOT NULL,
    model character varying NOT NULL,
    year integer,
    "plateNumber" character varying,
    color character varying,
    vin character varying,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: beauty_appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beauty_appointments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "clientName" character varying NOT NULL,
    "clientPhone" character varying,
    "masterId" uuid,
    "masterName" character varying,
    "serviceId" uuid,
    "serviceName" character varying,
    "servicePrice" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    date date NOT NULL,
    "timeSlot" character varying NOT NULL,
    duration integer DEFAULT 60 NOT NULL,
    status character varying DEFAULT 'scheduled'::character varying NOT NULL,
    notes text,
    fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: beauty_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beauty_masters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    phone character varying,
    specialty character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "totalAppointments" integer DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: beauty_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beauty_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying NOT NULL,
    category character varying,
    duration integer DEFAULT 60 NOT NULL,
    price numeric(12,2) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: branch_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_transfers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    "fromBranchId" uuid,
    "toBranchId" uuid,
    "productId" uuid NOT NULL,
    "productName" character varying NOT NULL,
    quantity integer NOT NULL,
    "unitCost" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    status public.branch_transfers_status_enum DEFAULT 'completed'::public.branch_transfers_status_enum NOT NULL,
    notes text,
    "initiatedBy" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying NOT NULL,
    name character varying(120) NOT NULL,
    address character varying,
    phone character varying,
    "managerName" character varying,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bug_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bug_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "bugId" uuid NOT NULL,
    "authorEmail" character varying,
    body text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bugs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bugs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" character varying,
    "tenantName" character varying,
    type public.bugs_type_enum NOT NULL,
    message text NOT NULL,
    stack text,
    url character varying,
    "userEmail" character varying,
    status public.bugs_status_enum DEFAULT 'new'::public.bugs_status_enum NOT NULL,
    "assignedTo" character varying,
    "resolvedAt" timestamp with time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    title character varying(255),
    description text,
    priority public.bugs_priority_enum DEFAULT 'P3'::public.bugs_priority_enum NOT NULL,
    source character varying,
    "moduleAffected" character varying,
    "slaDeadline" timestamp with time zone,
    "resolutionNote" text,
    "userAgent" character varying,
    "statusCode" integer,
    method character varying
);


--
-- Name: clinic_appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_appointments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "patientId" uuid,
    "patientName" character varying,
    "doctorId" uuid,
    "doctorName" character varying,
    specialty character varying,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    duration integer DEFAULT 30 NOT NULL,
    type character varying,
    status character varying DEFAULT 'scheduled'::character varying NOT NULL,
    notes text,
    fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clinic_doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_doctors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    phone character varying,
    specialty character varying,
    schedule text,
    "consultationFee" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clinic_medicines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_medicines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying NOT NULL,
    category character varying,
    unit character varying,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    stock numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "minStock" numeric(10,2) DEFAULT '5'::numeric NOT NULL,
    manufacturer character varying,
    "expiryDate" date,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clinic_patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_patients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    phone character varying,
    "dateOfBirth" date,
    gender character varying,
    "bloodType" character varying,
    address text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clinic_prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_prescriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "patientId" uuid,
    "patientName" character varying DEFAULT ''::character varying NOT NULL,
    "doctorId" uuid,
    "doctorName" character varying DEFAULT ''::character varying NOT NULL,
    date character varying NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    diagnosis character varying,
    notes text,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying NOT NULL,
    phone character varying,
    address character varying,
    "totalDebt" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    password character varying,
    "sessionToken" character varying,
    "portalEnabled" boolean DEFAULT false NOT NULL
);


--
-- Name: debts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "saleId" uuid NOT NULL,
    "customerId" uuid,
    "customerName" character varying DEFAULT ''::character varying NOT NULL,
    "originalAmount" numeric(15,2) NOT NULL,
    "remainingAmount" numeric(15,2) NOT NULL,
    status public.debts_status_enum DEFAULT 'pending'::public.debts_status_enum NOT NULL,
    "dueDate" character varying,
    notes character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: edu_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edu_attendance (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "studentId" uuid,
    "studentName" character varying,
    "courseId" uuid,
    "courseName" character varying,
    date date NOT NULL,
    status character varying DEFAULT 'present'::character varying NOT NULL,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: edu_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edu_courses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "teacherId" uuid,
    "teacherName" character varying,
    "durationMonths" integer DEFAULT 0 NOT NULL,
    "monthlyFee" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    schedule character varying,
    level character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "maxStudents" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: edu_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edu_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "studentId" uuid,
    "studentName" character varying DEFAULT ''::character varying NOT NULL,
    "courseId" uuid,
    "courseName" character varying DEFAULT ''::character varying NOT NULL,
    month character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    "paidAt" character varying,
    "paymentMethod" character varying,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: edu_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edu_students (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    phone character varying,
    "parentPhone" character varying,
    "courseId" uuid,
    "courseName" character varying,
    "group" character varying,
    level character varying,
    "monthlyFee" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    "enrolledAt" date,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: edu_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edu_teachers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    phone character varying,
    subject character varying,
    salary numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    schedule character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "tenantId" uuid NOT NULL,
    "sessionToken" text,
    "refreshToken" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    role character varying DEFAULT 'cashier'::character varying NOT NULL
);


--
-- Name: generated_crms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_crms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    config jsonb NOT NULL,
    status public.generated_crms_status_enum DEFAULT 'active'::public.generated_crms_status_enum NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: gym_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gym_checkins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "memberId" uuid NOT NULL,
    "memberName" character varying NOT NULL,
    note character varying,
    "checkedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: gym_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gym_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    phone character varying,
    email character varying,
    "planId" uuid,
    "planName" character varying,
    "planPrice" numeric(12,2),
    "joinedAt" date,
    "expiresAt" date,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    "totalCheckins" integer DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: gym_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gym_plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    "durationDays" integer DEFAULT 30 NOT NULL,
    price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    "productName" character varying NOT NULL,
    type public.inventory_movements_type_enum NOT NULL,
    quantity numeric(15,2) NOT NULL,
    "stockBefore" numeric(15,2) NOT NULL,
    "stockAfter" numeric(15,2) NOT NULL,
    "referenceId" uuid,
    notes character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "subscriptionId" uuid NOT NULL,
    amount integer NOT NULL,
    method public.payment_history_method_enum NOT NULL,
    status public.payment_history_status_enum DEFAULT 'pending'::public.payment_history_status_enum NOT NULL,
    "transactionId" character varying,
    description text,
    "paidAt" timestamp with time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "customerId" uuid,
    "customerName" character varying NOT NULL,
    amount numeric(15,2) NOT NULL,
    type public.payments_type_enum NOT NULL,
    method public.payments_method_enum DEFAULT 'cash'::public.payments_method_enum NOT NULL,
    status public.payments_status_enum DEFAULT 'pending'::public.payments_status_enum NOT NULL,
    description character varying,
    "saleId" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying NOT NULL,
    price numeric(15,2) NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "costPrice" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "minStock" integer DEFAULT 5 NOT NULL,
    category character varying NOT NULL,
    unit character varying DEFAULT 'dona'::character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    barcode character varying,
    "priceCurrency" character varying(3) DEFAULT 'uzs'::character varying NOT NULL,
    "priceUsd" numeric(15,2)
);


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    title character varying NOT NULL,
    description text,
    "imageUrl" character varying,
    "validUntil" timestamp without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: rest_menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rest_menu_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    name character varying NOT NULL,
    category character varying,
    description text,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "imageUrl" character varying,
    "preparationTime" integer DEFAULT 0 NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "isPopular" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: rest_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rest_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "tableId" character varying,
    "tableNumber" character varying,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    total numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    "paymentMethod" character varying,
    notes text,
    "customerName" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: rest_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rest_tables (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    number character varying NOT NULL,
    capacity integer DEFAULT 4 NOT NULL,
    zone character varying,
    status character varying DEFAULT 'free'::character varying NOT NULL,
    "currentOrderId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sale_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_returns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "saleId" uuid NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    reason character varying,
    status public.sale_returns_status_enum DEFAULT 'pending'::public.sale_returns_status_enum NOT NULL,
    "totalRefund" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "customerName" character varying DEFAULT ''::character varying NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    status public.sales_status_enum DEFAULT 'completed'::public.sales_status_enum NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "cashReceived" numeric(15,2),
    change numeric(15,2),
    "mixedCash" numeric(15,2),
    "mixedCard" numeric(15,2),
    "paymentType" character varying DEFAULT 'cash'::character varying NOT NULL,
    "customerId" uuid,
    currency character varying DEFAULT 'uzs'::character varying NOT NULL,
    "currencyRate" numeric(15,4) DEFAULT '1'::numeric NOT NULL,
    "amountInCurrency" numeric(15,2),
    "partialPaid" numeric(15,2),
    "partialRemaining" numeric(15,2),
    "mixedTransfer" numeric(15,2)
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    status public.subscriptions_status_enum DEFAULT 'trial'::public.subscriptions_status_enum NOT NULL,
    "billingCycle" public.subscriptions_billingcycle_enum DEFAULT 'monthly'::public.subscriptions_billingcycle_enum NOT NULL,
    "usersLimit" integer DEFAULT 3 NOT NULL,
    "storageLimit" integer DEFAULT 500 NOT NULL,
    "apiCallsLimit" integer DEFAULT 500 NOT NULL,
    "currentApiCalls" integer DEFAULT 0 NOT NULL,
    "currentUsers" integer DEFAULT 0 NOT NULL,
    "priceUzs" integer DEFAULT 0 NOT NULL,
    "trialEndsAt" timestamp with time zone,
    "currentPeriodStart" timestamp with time zone NOT NULL,
    "currentPeriodEnd" timestamp with time zone NOT NULL,
    "paymentMethod" public.subscriptions_paymentmethod_enum DEFAULT 'manual'::public.subscriptions_paymentmethod_enum NOT NULL,
    "lastPaymentAt" timestamp with time zone,
    "lastPaymentAmount" integer,
    "nextPaymentAt" timestamp with time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "pendingCycle" public.subscriptions_pendingcycle_enum,
    "pendingRequestedAt" timestamp with time zone,
    plan character varying DEFAULT 'trial'::character varying NOT NULL,
    "pendingPlan" character varying
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    "ownerId" uuid NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    role public.users_role_enum DEFAULT 'user'::public.users_role_enum NOT NULL,
    "tenantId" uuid,
    "refreshToken" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "firstName" character varying,
    "lastName" character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdBy" uuid,
    "sessionToken" text,
    "googleId" character varying
);


--
-- Name: warehouse_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    "productName" character varying NOT NULL,
    type public.warehouse_logs_type_enum NOT NULL,
    quantity integer NOT NULL,
    price numeric(15,2) NOT NULL,
    "totalAmount" numeric(15,2) NOT NULL,
    reason character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: wizard_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wizard_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "tenantId" uuid NOT NULL,
    industry public.wizard_configs_industry_enum NOT NULL,
    modules jsonb DEFAULT '[]'::jsonb NOT NULL,
    roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    theme jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.wizard_configs_status_enum DEFAULT 'draft'::public.wizard_configs_status_enum NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    dashboard jsonb DEFAULT '{}'::jsonb NOT NULL,
    receipt jsonb DEFAULT '{}'::jsonb NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    "companyName" character varying,
    "companyPhone" character varying,
    "companyAddress" character varying,
    "logoUrl" character varying,
    language public.wizard_configs_language_enum DEFAULT 'uz'::public.wizard_configs_language_enum NOT NULL,
    currency public.wizard_configs_currency_enum DEFAULT 'uzs'::public.wizard_configs_currency_enum NOT NULL,
    "workingHoursStart" character varying,
    "workingHoursEnd" character varying,
    "workingDays" text,
    "receiptSize" public.wizard_configs_receiptsize_enum DEFAULT '58mm'::public.wizard_configs_receiptsize_enum NOT NULL,
    "receiptShowLogo" boolean DEFAULT true NOT NULL,
    "receiptShowPhone" boolean DEFAULT true NOT NULL,
    "receiptShowAddress" boolean DEFAULT true NOT NULL,
    "receiptShowQr" boolean DEFAULT false NOT NULL,
    "receiptFooter" text,
    "discountMode" public.wizard_configs_discountmode_enum DEFAULT 'classic'::public.wizard_configs_discountmode_enum NOT NULL,
    "exportFormats" text,
    "wizardCompleted" boolean DEFAULT false NOT NULL,
    "posCardStyle" character varying DEFAULT 'grid_no_photo'::character varying,
    "posShowCategories" boolean DEFAULT false NOT NULL,
    "posBarcode" boolean DEFAULT false NOT NULL,
    "posCustomer" boolean DEFAULT true NOT NULL,
    "posDiscount" boolean DEFAULT true NOT NULL,
    "posPaymentMethods" text,
    "posCurrencies" text,
    "posMarkupAllowed" boolean DEFAULT false NOT NULL,
    "posCustomerRequired" character varying DEFAULT 'credit_only'::character varying NOT NULL,
    "customerLevels" jsonb
);


--
-- Name: auto_service_orders PK_08045e00df86fbcda0a76cf91d3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_service_orders
    ADD CONSTRAINT "PK_08045e00df86fbcda0a76cf91d3" PRIMARY KEY (id);


--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);


--
-- Name: sale_returns PK_0dacb97f81ef1ca47f61409f844; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_returns
    ADD CONSTRAINT "PK_0dacb97f81ef1ca47f61409f844" PRIMARY KEY (id);


--
-- Name: gym_plans PK_0fa5269a72314b20b4ec9968094; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gym_plans
    ADD CONSTRAINT "PK_0fa5269a72314b20b4ec9968094" PRIMARY KEY (id);


--
-- Name: customers PK_133ec679a801fab5e070f73d3ea; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);


--
-- Name: warehouse_logs PK_1361d33d9f201126b32cf2cb41f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_logs
    ADD CONSTRAINT "PK_1361d33d9f201126b32cf2cb41f" PRIMARY KEY (id);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: clinic_medicines PK_1f3b856d19053f478aaaf81ba12; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_medicines
    ADD CONSTRAINT "PK_1f3b856d19053f478aaaf81ba12" PRIMARY KEY (id);


--
-- Name: auto_vehicles PK_2374735aa722536d9e1b672fb9e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_vehicles
    ADD CONSTRAINT "PK_2374735aa722536d9e1b672fb9e" PRIMARY KEY (id);


--
-- Name: generated_crms PK_38001f090aa2d84b5942eb7f359; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_crms
    ADD CONSTRAINT "PK_38001f090aa2d84b5942eb7f359" PRIMARY KEY (id);


--
-- Name: promotions PK_380cecbbe3ac11f0e5a7c452c34; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT "PK_380cecbbe3ac11f0e5a7c452c34" PRIMARY KEY (id);


--
-- Name: edu_students PK_491bf0ac50ff83be667ab0a2ded; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edu_students
    ADD CONSTRAINT "PK_491bf0ac50ff83be667ab0a2ded" PRIMARY KEY (id);


--
-- Name: debts PK_4bd9f54aab9e59628a3a2657fa1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT "PK_4bd9f54aab9e59628a3a2657fa1" PRIMARY KEY (id);


--
-- Name: sales PK_4f0bc990ae81dba46da680895ea; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY (id);


--
-- Name: tenants PK_53be67a04681c66b87ee27c9321; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY (id);


--
-- Name: edu_payments PK_56945952b52d4d86024c01a5813; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edu_payments
    ADD CONSTRAINT "PK_56945952b52d4d86024c01a5813" PRIMARY KEY (id);


--
-- Name: rest_menu_items PK_5c688ad034d734e06ab8f528b99; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rest_menu_items
    ADD CONSTRAINT "PK_5c688ad034d734e06ab8f528b99" PRIMARY KEY (id);


--
-- Name: payment_history PK_5fcec51a769b65c0c3c0987f11c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT "PK_5fcec51a769b65c0c3c0987f11c" PRIMARY KEY (id);


--
-- Name: branches PK_7f37d3b42defea97f1df0d19535; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY (id);


--
-- Name: rest_tables PK_80ce6dea39f4618e75e3e809167; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rest_tables
    ADD CONSTRAINT "PK_80ce6dea39f4618e75e3e809167" PRIMARY KEY (id);


--
-- Name: edu_attendance PK_86d6761c44a23a6defea7eaa331; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edu_attendance
    ADD CONSTRAINT "PK_86d6761c44a23a6defea7eaa331" PRIMARY KEY (id);


--
-- Name: beauty_masters PK_8f635d4a7faf30b183979fa2392; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beauty_masters
    ADD CONSTRAINT "PK_8f635d4a7faf30b183979fa2392" PRIMARY KEY (id);


--
-- Name: clinic_appointments PK_9a8704dd0141b15335cb0349077; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_appointments
    ADD CONSTRAINT "PK_9a8704dd0141b15335cb0349077" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: branch_transfers PK_a7950661ab36dab2c22c74cb994; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT "PK_a7950661ab36dab2c22c74cb994" PRIMARY KEY (id);


--
-- Name: subscriptions PK_a87248d73155605cf782be9ee5e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY (id);


--
-- Name: edu_teachers PK_b321dfc23d09a8ef92a1746171c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edu_teachers
    ADD CONSTRAINT "PK_b321dfc23d09a8ef92a1746171c" PRIMARY KEY (id);


--
-- Name: announcements PK_b3ad760876ff2e19d58e05dc8b0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY (id);


--
-- Name: wizard_configs PK_b4dfa57ece3b055a7031da450af; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wizard_configs
    ADD CONSTRAINT "PK_b4dfa57ece3b055a7031da450af" PRIMARY KEY (id);


--
-- Name: rest_orders PK_b851b181118f4a422bde9cb3d02; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rest_orders
    ADD CONSTRAINT "PK_b851b181118f4a422bde9cb3d02" PRIMARY KEY (id);


--
-- Name: employees PK_b9535a98350d5b26e7eb0c26af4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY (id);


--
-- Name: beauty_appointments PK_c64ada95e25ac6109be23e9c7c7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beauty_appointments
    ADD CONSTRAINT "PK_c64ada95e25ac6109be23e9c7c7" PRIMARY KEY (id);


--
-- Name: gym_members PK_c8ec596e819911e06aa04b54b8f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gym_members
    ADD CONSTRAINT "PK_c8ec596e819911e06aa04b54b8f" PRIMARY KEY (id);


--
-- Name: edu_courses PK_cb58a737e7cc950568acee20724; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edu_courses
    ADD CONSTRAINT "PK_cb58a737e7cc950568acee20724" PRIMARY KEY (id);


--
-- Name: clinic_prescriptions PK_cd25c677d5467b5c53a0ebbada1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_prescriptions
    ADD CONSTRAINT "PK_cd25c677d5467b5c53a0ebbada1" PRIMARY KEY (id);


--
-- Name: inventory_movements PK_d7597827c1dcffae889db3ab873; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT "PK_d7597827c1dcffae889db3ab873" PRIMARY KEY (id);


--
-- Name: clinic_doctors PK_d771ad727b2e59c2adcbdc6eb6e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_doctors
    ADD CONSTRAINT "PK_d771ad727b2e59c2adcbdc6eb6e" PRIMARY KEY (id);


--
-- Name: bugs PK_dadac7f01b703d50496ae1d3e74; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bugs
    ADD CONSTRAINT "PK_dadac7f01b703d50496ae1d3e74" PRIMARY KEY (id);


--
-- Name: gym_checkins PK_dd5405615a1e5c60c5b5b9e111e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gym_checkins
    ADD CONSTRAINT "PK_dd5405615a1e5c60c5b5b9e111e" PRIMARY KEY (id);


--
-- Name: clinic_patients PK_e4b871c6733d596d35fe3e27628; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_patients
    ADD CONSTRAINT "PK_e4b871c6733d596d35fe3e27628" PRIMARY KEY (id);


--
-- Name: beauty_services PK_eddf80cab4f364d5604d599d466; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beauty_services
    ADD CONSTRAINT "PK_eddf80cab4f364d5604d599d466" PRIMARY KEY (id);


--
-- Name: bug_comments PK_f0b5fcde94249aaa2de2ad287f3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_comments
    ADD CONSTRAINT "PK_f0b5fcde94249aaa2de2ad287f3" PRIMARY KEY (id);


--
-- Name: tenants UQ_2310ecc5cb8be427097154b18fc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE (slug);


--
-- Name: employees UQ_765bc1ac8967533a04c74a9f6af; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE (email);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: wizard_configs UQ_a711e2e70bd02bbc087964f6741; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wizard_configs
    ADD CONSTRAINT "UQ_a711e2e70bd02bbc087964f6741" UNIQUE ("tenantId");


--
-- Name: generated_crms UQ_d62f16faa92ed5739eeed4919f2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_crms
    ADD CONSTRAINT "UQ_d62f16faa92ed5739eeed4919f2" UNIQUE ("tenantId");


--
-- Name: users UQ_f382af58ab36057334fb262efd5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId");


--
-- Name: bug_comments FK_462fdcaf973e3a68a802e7969f7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bug_comments
    ADD CONSTRAINT "FK_462fdcaf973e3a68a802e7969f7" FOREIGN KEY ("bugId") REFERENCES public.bugs(id) ON DELETE CASCADE;


--
-- Name: branch_transfers FK_c8274ec0511e5fb473e38308cf4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT "FK_c8274ec0511e5fb473e38308cf4" FOREIGN KEY ("toBranchId") REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: branch_transfers FK_ca007b907b741f39e3a74ccd1cd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_transfers
    ADD CONSTRAINT "FK_ca007b907b741f39e3a74ccd1cd" FOREIGN KEY ("fromBranchId") REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict NNiuNagLxlfXdoTgEcYBqpQL5c80Wg1ym8yq2kdSQcCldom5jfrlCiIXTqj569h

