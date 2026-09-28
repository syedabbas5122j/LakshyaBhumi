import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/citizen_model.dart';
import '../services/citizen_api_service.dart';

class CitizenProvider extends ChangeNotifier {
  // Auth state
  bool _isAuthenticated = false;
  CitizenRoleType _activeRole = CitizenRoleType.landOwner;
  String _contactNumber = '';
  String? _authToken;

  // Parcel state
  List<ParcelRecord> _allParcels = [];
  List<ParcelRecord> _filteredParcels = [];
  ParcelRecord? _selectedParcel;
  String _searchQuery = '';
  bool _isLoading = false;

  // Requests state
  final List<CitizenRequest> _requests = [];
  bool _isSubmittingRequest = false;

  // Navigation tab
  int _currentTabIndex = 0;

  // Getters
  bool get isAuthenticated => _isAuthenticated;
  CitizenRoleType get activeRole => _activeRole;
  String get contactNumber => _contactNumber;
  String? get authToken => _authToken;
  List<ParcelRecord> get parcels => _filteredParcels;
  ParcelRecord get selectedParcel => _selectedParcel ?? _allParcels.first;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;
  List<CitizenRequest> get requests => _requests;
  bool get isSubmittingRequest => _isSubmittingRequest;
  int get currentTabIndex => _currentTabIndex;

  CitizenProvider() {
    _initData();
  }

  void _initData() {
    _allParcels = CitizenApiService.getMockParcels();
    _filteredParcels = List.from(_allParcels);
    _selectedParcel = _allParcels.isNotEmpty ? _allParcels.first : null;

    // Seed default demo request
    _requests.add(
      CitizenRequest(
        id: 'AP-REQ-2026-9041',
        surveyNumber: '241/6',
        village: 'Tirupati Urban',
        type: 'Claim',
        title: 'Boundary Confirmation for Subdivision',
        description: 'Verification of western boundary adjoining survey 241/7 requested.',
        status: RequestStatus.underReview,
        submittedAt: DateTime.now().subtract(const Duration(days: 2)),
        timeline: [
          'Request submitted by Land Owner (26 Sep 2026)',
          'Routed to Mandal Revenue Officer & Surveyor (27 Sep 2026)',
          'High-precision Drone Cadastral overlap attached',
        ],
      ),
    );
  }

  void selectRole(CitizenRoleType role) {
    _activeRole = role;
    notifyListeners();
  }

  Future<bool> loginWithOtp(String phone, String otp) async {
    _isLoading = true;
    notifyListeners();

    final result = await CitizenApiService.verifyOtp(
      contact: phone,
      code: otp,
      role: _activeRole.label,
    );

    _isLoading = false;
    if (result['status'] == 'authenticated' || result['token'] != null) {
      _isAuthenticated = true;
      _contactNumber = phone;
      _authToken = result['token'] as String? ?? 'demo-token';
      notifyListeners();
      return true;
    }
    return false;
  }

  void signOut() {
    _isAuthenticated = false;
    _contactNumber = '';
    _authToken = null;
    _currentTabIndex = 0;
    notifyListeners();
  }

  void setTabIndex(int index) {
    _currentTabIndex = index;
    notifyListeners();
  }

  void searchParcels(String query) {
    _searchQuery = query.trim().toLowerCase();
    if (_searchQuery.isEmpty) {
      _filteredParcels = List.from(_allParcels);
    } else {
      _filteredParcels = _allParcels.where((p) {
        return p.survey.toLowerCase().contains(_searchQuery) ||
            p.village.toLowerCase().contains(_searchQuery) ||
            p.district.toLowerCase().contains(_searchQuery) ||
            p.pattadarName.toLowerCase().contains(_searchQuery) ||
            p.khataNumber.toLowerCase().contains(_searchQuery);
      }).toList();
    }
    notifyListeners();
  }

  void selectParcel(ParcelRecord parcel) {
    _selectedParcel = parcel;
    notifyListeners();
  }

  Future<String> submitCitizenRequest({
    required String surveyNumber,
    required String village,
    required String type,
    required String title,
    required String description,
    String? attachmentName,
  }) async {
    _isSubmittingRequest = true;
    notifyListeners();

    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 900));

    final randomId = 'AP-REQ-2026-${(1000 + Random().nextInt(9000))}';
    final newRequest = CitizenRequest(
      id: randomId,
      surveyNumber: surveyNumber,
      village: village,
      type: type,
      title: title,
      description: description,
      status: RequestStatus.pending,
      submittedAt: DateTime.now(),
      attachmentName: attachmentName,
      timeline: [
        'Request generated ($randomId) by ${_activeRole.label}',
        'Queued for Mandal Revenue Officer review',
      ],
    );

    _requests.insert(0, newRequest);
    _isSubmittingRequest = false;
    notifyListeners();

    return randomId;
  }
}
