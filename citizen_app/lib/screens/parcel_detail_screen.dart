import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/citizen_model.dart';
import '../providers/citizen_provider.dart';
import '../theme/app_theme.dart';
import 'request_submission_screen.dart';

class ParcelDetailScreen extends StatelessWidget {
  final ParcelRecord parcel;

  const ParcelDetailScreen({super.key, required this.parcel});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CitizenProvider>(context);
    final isBankOfficer = provider.activeRole == CitizenRoleType.bankMortgageOfficer;

    return Scaffold(
      backgroundColor: AppTheme.paper,
      appBar: AppBar(
        title: Text(isBankOfficer ? 'Bank Collateral Appraisal' : 'Survey ${parcel.survey} Inspector'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, size: 18),
            tooltip: 'Share verification',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Auditable link copied for Survey ${parcel.survey}'),
                  backgroundColor: AppTheme.ink,
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Summary Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0x38FFFFFF),
                border: Border.all(color: AppTheme.line),
                borderRadius: BorderRadius.circular(2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'PARCEL IDENTIFIER',
                            style: GoogleFonts.dmSans(
                              fontSize: 8,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.muted,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Survey ${parcel.survey}',
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 22,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.ink,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0x1F2F7F56),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: Text(
                          '${parcel.confidence} Confidence',
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.green,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${parcel.village}, ${parcel.mandal} Mandal, ${parcel.district} Dist, ${parcel.state}',
                    style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.muted),
                  ),
                  const Divider(color: AppTheme.line, height: 24),

                  // Area & Attributes Grid
                  Row(
                    children: [
                      Expanded(child: _buildAttributeItem('MAPPED AREA', parcel.area)),
                      Expanded(child: _buildAttributeItem('KHATA / ROR', parcel.khataNumber)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(child: _buildAttributeItem('PATTADAR / BORROWER', parcel.pattadarName)),
                      Expanded(child: _buildAttributeItem('LAST HARMONIZED', parcel.updated)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Dedicated Bank & Mortgage Appraisal Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isBankOfficer ? const Color(0x1A348C8B) : const Color(0x38FFFFFF),
                border: Border.all(
                  color: isBankOfficer ? AppTheme.teal : AppTheme.line,
                  width: isBankOfficer ? 1.5 : 1,
                ),
                borderRadius: BorderRadius.circular(2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.account_balance, size: 16, color: isBankOfficer ? AppTheme.teal : AppTheme.ink),
                          const SizedBox(width: 6),
                          Text(
                            'MORTGAGE & COLLATERAL APPRAISAL',
                            style: GoogleFonts.dmSans(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.9,
                              color: isBankOfficer ? AppTheme.teal : AppTheme.muted,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: parcel.hasBoundaryDispute ? const Color(0x22EF4444) : const Color(0x1F2F7F56),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: Text(
                          parcel.hasBoundaryDispute ? 'DISPUTE FLAGGED' : 'COLLATERAL READY',
                          style: GoogleFonts.dmSans(
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                            color: parcel.hasBoundaryDispute ? AppTheme.danger : AppTheme.green,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildBankDetailRow('Encumbrance Status', parcel.encumbranceStatus, isHighlight: true),
                  const SizedBox(height: 8),
                  _buildBankDetailRow('EC Certificate No.', parcel.ecNumber),
                  const SizedBox(height: 8),
                  _buildBankDetailRow('Mortgage Eligibility', parcel.mortgageEligibility),
                  const SizedBox(height: 8),
                  _buildBankDetailRow('SRO Guidance Valuation', parcel.estimatedValuation),
                  const SizedBox(height: 8),
                  _buildBankDetailRow('Land Classification', parcel.landClassification),
                  const Divider(color: AppTheme.line, height: 20),

                  // Bank Appraisal Actions
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isBankOfficer ? AppTheme.ink : AppTheme.green,
                      minimumSize: const Size.fromHeight(38),
                      padding: EdgeInsets.zero,
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Generating Bank Mortgage Appraisal Certificate for Survey ${parcel.survey}...'),
                          backgroundColor: AppTheme.ink,
                        ),
                      );
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.picture_as_pdf_outlined, size: 16, color: Colors.white),
                        const SizedBox(width: 8),
                        Text(
                          'EXPORT BANK APPRAISAL CERTIFICATE (PDF)',
                          style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.ink,
                      side: const BorderSide(color: AppTheme.line),
                      minimumSize: const Size.fromHeight(36),
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
                    ),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => RequestSubmissionScreen(
                            initialSurvey: parcel.survey,
                            initialVillage: parcel.village,
                          ),
                        ),
                      );
                    },
                    child: Text(
                      'File SRO Lien / Pre-Disbursement Inquiry →',
                      style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // AI Harmonization Flags
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0x38FFFFFF),
                border: Border.all(color: AppTheme.line),
                borderRadius: BorderRadius.circular(2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'AI HARMONIZATION & VALIDATION FLAGS',
                    style: GoogleFonts.dmSans(
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.muted,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: parcel.qualityFlags.map((flag) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0x12348C8B),
                          border: Border.all(color: const Color(0x33348C8B)),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: Text(
                          flag,
                          style: GoogleFonts.dmSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.ink,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Audit Trail / Lineage
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0x38FFFFFF),
                border: Border.all(color: AppTheme.line),
                borderRadius: BorderRadius.circular(2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'AUDIT TRAIL & SURVEY LINEAGE',
                    style: GoogleFonts.dmSans(
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.muted,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...parcel.history.map((event) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0x2218332D),
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: Text(
                              event.date,
                              style: GoogleFonts.dmSans(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.ink,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  event.title,
                                  style: GoogleFonts.spaceGrotesk(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.ink,
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  event.description,
                                  style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.muted),
                                ),
                                Text(
                                  event.department,
                                  style: GoogleFonts.dmSans(fontSize: 9, color: AppTheme.green),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttributeItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.dmSans(
            fontSize: 8,
            fontWeight: FontWeight.w700,
            color: AppTheme.muted,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.spaceGrotesk(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppTheme.ink,
          ),
        ),
      ],
    );
  }

  Widget _buildBankDetailRow(String title, String value, {bool isHighlight = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 130,
          child: Text(
            title,
            style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.muted, fontWeight: FontWeight.w500),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.dmSans(
              fontSize: 11,
              fontWeight: isHighlight ? FontWeight.w700 : FontWeight.w600,
              color: isHighlight ? AppTheme.green : AppTheme.ink,
            ),
          ),
        ),
      ],
    );
  }
}
