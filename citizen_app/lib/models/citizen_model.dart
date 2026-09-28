import 'package:latlong2/latlong.dart';

enum CitizenRoleType {
  landOwner,
  propertyBuyerSeller,
  propertyLawyer,
  bankMortgageOfficer,
  realEstateDeveloper,
}

extension CitizenRoleExtension on CitizenRoleType {
  String get label {
    switch (this) {
      case CitizenRoleType.landOwner:
        return 'Land Owner';
      case CitizenRoleType.propertyBuyerSeller:
        return 'Property Buyer / Seller';
      case CitizenRoleType.propertyLawyer:
        return 'Property Lawyer';
      case CitizenRoleType.bankMortgageOfficer:
        return 'Bank / Mortgage Officer';
      case CitizenRoleType.realEstateDeveloper:
        return 'Real Estate Developer';
    }
  }

  String get description {
    switch (this) {
      case CitizenRoleType.landOwner:
        return 'View parcel ownership, verify boundaries, file claims & objections.';
      case CitizenRoleType.propertyBuyerSeller:
        return 'Read-only parcel verification, check area, legal status & uncertainty.';
      case CitizenRoleType.propertyLawyer:
        return 'Review legal status, source lineage, dispute status & audit documents.';
      case CitizenRoleType.bankMortgageOfficer:
        return 'Appraise loan collateral, verify non-encumbrance (EC), inspect boundary integrity & export audit appraisal certificates.';
      case CitizenRoleType.realEstateDeveloper:
        return 'Explore municipal zoning, land-use layers and parcel aggregations.';
    }
  }

  String get iconName {
    switch (this) {
      case CitizenRoleType.landOwner:
        return 'person';
      case CitizenRoleType.propertyBuyerSeller:
        return 'store';
      case CitizenRoleType.propertyLawyer:
        return 'gavel';
      case CitizenRoleType.bankMortgageOfficer:
        return 'account_balance';
      case CitizenRoleType.realEstateDeveloper:
        return 'apartment';
    }
  }
}

class RecordHistoryItem {
  final String date;
  final String title;
  final String description;
  final String department;

  const RecordHistoryItem({
    required this.date,
    required this.title,
    required this.description,
    required this.department,
  });

  factory RecordHistoryItem.fromJson(Map<String, dynamic> json) {
    return RecordHistoryItem(
      date: json['date'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      department: json['department'] as String? ?? 'Survey Dept',
    );
  }
}

class ParcelRecord {
  final String survey;
  final String village;
  final String mandal;
  final String district;
  final String state;
  final String area;
  final double areaSqMeters;
  final String confidence;
  final double confidenceScore;
  final String status;
  final String legalStatus;
  final String updated;
  final LatLng center;
  final List<LatLng> boundary;
  final List<RecordHistoryItem> history;
  final String pattadarName;
  final String khataNumber;
  final List<String> qualityFlags;

  // Dedicated Bank / Mortgage Appraisal Fields
  final String encumbranceStatus;
  final String mortgageEligibility;
  final String estimatedValuation;
  final String landClassification;
  final String ecNumber;
  final bool hasBoundaryDispute;

  const ParcelRecord({
    required this.survey,
    required this.village,
    required this.mandal,
    required this.district,
    required this.state,
    required this.area,
    required this.areaSqMeters,
    required this.confidence,
    required this.confidenceScore,
    required this.status,
    required this.legalStatus,
    required this.updated,
    required this.center,
    required this.boundary,
    required this.history,
    required this.pattadarName,
    required this.khataNumber,
    required this.qualityFlags,
    this.encumbranceStatus = 'Non-Encumbered / Nil EC (Clear Title)',
    this.mortgageEligibility = 'Approved for Collateral Pledge',
    this.estimatedValuation = '₹42.50 Lakhs (Govt. Guidance Value)',
    this.landClassification = 'Dry Agricultural (Patta Land)',
    this.ecNumber = 'EC-AP-2026-8812',
    this.hasBoundaryDispute = false,
  });
}

enum RequestStatus {
  pending,
  underReview,
  surveyScheduled,
  resolved,
  rejected,
}

class CitizenRequest {
  final String id;
  final String surveyNumber;
  final String village;
  final String type; // Claim, Objection, Re-Survey, Mortgage Appraisal, Lien Filing
  final String title;
  final String description;
  final RequestStatus status;
  final DateTime submittedAt;
  final String? attachmentName;
  final List<String> timeline;

  const CitizenRequest({
    required this.id,
    required this.surveyNumber,
    required this.village,
    required this.type,
    required this.title,
    required this.description,
    required this.status,
    required this.submittedAt,
    this.attachmentName,
    required this.timeline,
  });
}
