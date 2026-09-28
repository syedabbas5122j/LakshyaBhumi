import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../models/citizen_model.dart';

class CitizenApiService {
  static String baseUrl = 'http://localhost:8000';

  static Future<Map<String, dynamic>> requestOtp({
    required String contact,
    required String role,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/v1/auth/citizen/otp/request'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'contact': contact, 'role': role}),
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}

    return {
      'status': 'success',
      'message': 'OTP sent successfully (Demo Mode)',
      'code_preview': '123456',
    };
  }

  static Future<Map<String, dynamic>> verifyOtp({
    required String contact,
    required String code,
    required String role,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/v1/auth/citizen/otp/verify'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'contact': contact, 'code': code, 'role': role}),
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}

    return {
      'status': 'authenticated',
      'token': 'demo-citizen-token-jwt',
      'role': role,
      'contact': contact,
    };
  }

  static List<ParcelRecord> getMockParcels() {
    return [
      ParcelRecord(
        survey: '241/6',
        village: 'Tirupati Urban',
        mandal: 'Tirupati Urban',
        district: 'Tirupati',
        state: 'Andhra Pradesh',
        area: '0.84 Acres (3,400 sq.m)',
        areaSqMeters: 3400.0,
        confidence: '98.2%',
        confidenceScore: 0.982,
        status: 'Authoritative / Synchronized',
        legalStatus: 'Clear Title / No Encumbrances',
        updated: '27 Sep 2026',
        pattadarName: 'K. Venkata Rao',
        khataNumber: 'KH-1094',
        qualityFlags: ['Drone Survey Verified', 'RoR Linked', 'GNSS Snapped', 'Nil Encumbrance (2026)'],
        encumbranceStatus: 'Nil Encumbrance (No active mortgage / lien)',
        mortgageEligibility: 'Approved for Loan Collateral (Low Risk)',
        estimatedValuation: '₹48.50 Lakhs (SRO Guidance Value)',
        landClassification: 'Dry Agricultural (Patta Land)',
        ecNumber: 'EC-AP-2026-8812',
        hasBoundaryDispute: false,
        center: const LatLng(13.6288, 79.4192),
        boundary: [
          const LatLng(13.6292, 79.4185),
          const LatLng(13.6295, 79.4198),
          const LatLng(13.6284, 79.4201),
          const LatLng(13.6281, 79.4188),
          const LatLng(13.6292, 79.4185),
        ],
        history: const [
          RecordHistoryItem(
            date: '27 Sep 2026',
            title: 'Bank Mortgage Title Appraisal Clear',
            description: 'Non-encumbrance verified with Sub-Registrar Stamps & Registration database.',
            department: 'Registration & Stamps Dept (IGRS AP)',
          ),
          RecordHistoryItem(
            date: '22 Sep 2026',
            title: 'Revenue record linked to Aadhaar/Pattadar',
            description: 'Pahani & Record of Rights (RoR) khata KH-1094 joined successfully.',
            department: 'Revenue Dept (Meebhoomi)',
          ),
          RecordHistoryItem(
            date: '18 Sep 2026',
            title: 'High Precision Drone Survey 5cm GSD',
            description: 'Orthomosaic 5cm GSD captured under NAKSHA project.',
            department: 'Survey of India / NAKSHA',
          ),
        ],
      ),
      ParcelRecord(
        survey: '241/7',
        village: 'Tirupati Urban',
        mandal: 'Tirupati Urban',
        district: 'Tirupati',
        state: 'Andhra Pradesh',
        area: '1.12 Acres (4,532 sq.m)',
        areaSqMeters: 4532.0,
        confidence: '94.8%',
        confidenceScore: 0.948,
        status: 'Harmonized / Minor Boundary Sliver',
        legalStatus: 'Clear Title / Mutation Complete',
        updated: '24 Sep 2026',
        pattadarName: 'S. Lakshmi Narayana',
        khataNumber: 'KH-1095',
        qualityFlags: ['Auto-Topology Snapped', 'RoR Linked', 'Nil EC'],
        encumbranceStatus: 'Nil Encumbrance (Clear Title)',
        mortgageEligibility: 'Conditionally Approved (Minor Boundary Check)',
        estimatedValuation: '₹62.00 Lakhs (SRO Guidance Value)',
        landClassification: 'Dry Agricultural (Patta Land)',
        ecNumber: 'EC-AP-2026-8815',
        hasBoundaryDispute: false,
        center: const LatLng(13.6300, 79.4208),
        boundary: [
          const LatLng(13.6295, 79.4198),
          const LatLng(13.6308, 79.4215),
          const LatLng(13.6297, 79.4222),
          const LatLng(13.6284, 79.4201),
          const LatLng(13.6295, 79.4198),
        ],
        history: const [
          RecordHistoryItem(
            date: '24 Sep 2026',
            title: 'Topology Auto-Corrected',
            description: 'Adjacent boundary sliver auto-snapped within 0.15m tolerance.',
            department: 'AI Conflation Engine',
          ),
        ],
      ),
      ParcelRecord(
        survey: '242/1',
        village: 'Tirupati Urban',
        mandal: 'Tirupati Urban',
        district: 'Tirupati',
        state: 'Andhra Pradesh',
        area: '0.62 Acres (2,509 sq.m)',
        areaSqMeters: 2509.0,
        confidence: '99.1%',
        confidenceScore: 0.991,
        status: 'Authoritative / Survey-Grade',
        legalStatus: 'Clear Title',
        updated: '25 Sep 2026',
        pattadarName: 'M. Chengal Reddy',
        khataNumber: 'KH-1120',
        qualityFlags: ['CORS DGPS Reference', 'Field Verified', 'AI Harmonized', 'Bank Approved Collateral'],
        encumbranceStatus: 'Nil Encumbrance / Verified Bank Collateral',
        mortgageEligibility: 'Prime Collateral Asset (Grade A+)',
        estimatedValuation: '₹36.00 Lakhs (SRO Guidance Value)',
        landClassification: 'Residential Plotted (Gramakantam)',
        ecNumber: 'EC-AP-2026-8899',
        hasBoundaryDispute: false,
        center: const LatLng(13.6275, 79.4180),
        boundary: [
          const LatLng(13.6281, 79.4188),
          const LatLng(13.6284, 79.4201),
          const LatLng(13.6268, 79.4195),
          const LatLng(13.6265, 79.4175),
          const LatLng(13.6281, 79.4188),
        ],
        history: const [
          RecordHistoryItem(
            date: '25 Sep 2026',
            title: 'CORS Real-time GNSS Verified',
            description: 'Control points validated to <2cm root-mean-square precision.',
            department: 'Directorate of Survey',
          ),
        ],
      ),
      ParcelRecord(
        survey: '108/A',
        village: 'Chandragiri',
        mandal: 'Chandragiri',
        district: 'Tirupati',
        state: 'Andhra Pradesh',
        area: '2.45 Acres (9,915 sq.m)',
        areaSqMeters: 9915.0,
        confidence: '96.5%',
        confidenceScore: 0.965,
        status: 'Authoritative',
        legalStatus: 'Under Mortgage - Union Bank Loan',
        updated: '21 Sep 2026',
        pattadarName: 'P. Ramanatham',
        khataNumber: 'KH-842',
        qualityFlags: ['Drone ORI Verified', 'Active Bank Lien'],
        encumbranceStatus: 'Encumbered: Active Mortgage Charge (Union Bank ₹25L)',
        mortgageEligibility: 'Prior Mortgage Exists (Second Charge / NOC Required)',
        estimatedValuation: '₹1.15 Crore (SRO Guidance Value)',
        landClassification: 'Wet Agricultural (Double Crop)',
        ecNumber: 'EC-AP-2026-6410',
        hasBoundaryDispute: false,
        center: const LatLng(13.5833, 79.3167),
        boundary: [
          const LatLng(13.5845, 79.3155),
          const LatLng(13.5850, 79.3180),
          const LatLng(13.5820, 79.3175),
          const LatLng(13.5815, 79.3150),
          const LatLng(13.5845, 79.3155),
        ],
        history: const [
          RecordHistoryItem(
            date: '21 Sep 2026',
            title: 'Existing Bank Lien Registered',
            description: 'Simple Mortgage registered under SRO Chandragiri Book-1 Doc 4412/2024.',
            department: 'Sub-Registrar Office',
          ),
        ],
      ),
      ParcelRecord(
        survey: '89/2',
        village: 'Renigunta',
        mandal: 'Renigunta',
        district: 'Tirupati',
        state: 'Andhra Pradesh',
        area: '1.75 Acres (7,082 sq.m)',
        areaSqMeters: 7082.0,
        confidence: '91.4%',
        confidenceScore: 0.914,
        status: 'Pending Road Buffer Verification',
        legalStatus: 'Highway Right-of-Way Flag',
        updated: '26 Sep 2026',
        pattadarName: 'T. Subrahmanyam',
        khataNumber: 'KH-556',
        qualityFlags: ['Municipal Conflation', 'Road Right-of-Way Flag'],
        encumbranceStatus: 'Clear Title (Subject to Highway Widening Buffer)',
        mortgageEligibility: 'Caution: 15% Area Affected by Highway Buffer',
        estimatedValuation: '₹85.00 Lakhs (Net Effective Collateral ₹72L)',
        landClassification: 'Commercial / Semi-Urban',
        ecNumber: 'EC-AP-2026-9021',
        hasBoundaryDispute: true,
        center: const LatLng(13.6480, 79.5160),
        boundary: [
          const LatLng(13.6490, 79.5145),
          const LatLng(13.6500, 79.5175),
          const LatLng(13.6470, 79.5180),
          const LatLng(13.6465, 79.5150),
          const LatLng(13.6490, 79.5145),
        ],
        history: const [
          RecordHistoryItem(
            date: '26 Sep 2026',
            title: 'Master Plan Highway Overlay',
            description: 'Road widening buffer cross-checked with municipal layer.',
            department: 'Urban Development Authority',
          ),
        ],
      ),
    ];
  }
}
