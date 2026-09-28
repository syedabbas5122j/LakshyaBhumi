import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/citizen_model.dart';
import '../providers/citizen_provider.dart';
import '../theme/app_theme.dart';
import 'parcel_detail_screen.dart';
import 'request_submission_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CitizenProvider>(context);
    final activeRole = provider.activeRole;
    final selectedParcel = provider.selectedParcel;
    final parcels = provider.parcels;

    return Scaffold(
      backgroundColor: AppTheme.paper,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.green,
          backgroundColor: AppTheme.paper,
          onRefresh: () async {
            provider.searchParcels('');
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top Editorial Brand Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: AppTheme.ink,
                            borderRadius: BorderRadius.circular(2),
                          ),
                          child: Text(
                            'B',
                            style: GoogleFonts.spaceGrotesk(
                              color: AppTheme.paper,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'BhoomiSync',
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.ink,
                              ),
                            ),
                            Text(
                              activeRole.label.toUpperCase(),
                              style: GoogleFonts.dmSans(
                                fontSize: 8,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                                color: AppTheme.muted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () => provider.signOut(),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        'Sign out',
                        style: GoogleFonts.dmSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.green,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Eyebrow & Hero Headline
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PUBLIC LAND WORKSPACE',
                          style: GoogleFonts.dmSans(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                            color: AppTheme.green,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Search, review, act.',
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 24,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.ink,
                          ),
                        ),
                      ],
                    ),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.green,
                        side: const BorderSide(color: AppTheme.line),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Downloading Case Summary for Survey ${selectedParcel.survey}...'),
                            backgroundColor: AppTheme.ink,
                          ),
                        );
                      },
                      child: Text(
                        'Case summary ↓',
                        style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Panel 01: Parcel Search
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0x38FFFFFF),
                    border: Border.all(color: AppTheme.line),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '01 / PARCEL SEARCH',
                        style: GoogleFonts.dmSans(
                          fontSize: 8,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                          color: AppTheme.teal,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        onChanged: (val) => provider.searchParcels(val),
                        style: GoogleFonts.dmSans(color: AppTheme.ink, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Search survey number or village',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          suffixIcon: provider.searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 16, color: AppTheme.muted),
                                  onPressed: () => provider.searchParcels(''),
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Parcel Search Results list
                      ...parcels.map((parcel) {
                        final isSelected = parcel.survey == selectedParcel.survey;
                        return GestureDetector(
                          onTap: () => provider.selectParcel(parcel),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0x1A348C8B)
                                  : const Color(0x3DFFFFFF),
                              border: Border.all(
                                color: isSelected ? AppTheme.teal : Colors.transparent,
                                width: 1,
                              ),
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      parcel.survey,
                                      style: GoogleFonts.spaceGrotesk(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.ink,
                                      ),
                                    ),
                                    Text(
                                      parcel.village,
                                      style: GoogleFonts.dmSans(
                                        fontSize: 9,
                                        color: AppTheme.muted,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  parcel.confidence,
                                  style: GoogleFonts.dmSans(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.green,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 4),
                      GestureDetector(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Opening Bhu-Naksha Cadastral Web Service...'),
                              backgroundColor: AppTheme.ink,
                            ),
                          );
                        },
                        child: Text(
                          'Open official Bhu-Naksha ↗',
                          style: GoogleFonts.dmSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.green,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Panel 02: Parcel Inspector
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
                        '02 / PARCEL INSPECTOR',
                        style: GoogleFonts.dmSans(
                          fontSize: 8,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                          color: AppTheme.teal,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Survey ${selectedParcel.survey}',
                                style: GoogleFonts.spaceGrotesk(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.ink,
                                ),
                              ),
                              Text(
                                selectedParcel.village,
                                style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.muted),
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
                              'AUTHORITATIVE',
                              style: GoogleFonts.dmSans(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.green,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Metrics grid
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricBlock('Mapped area', selectedParcel.area),
                          ),
                          Expanded(
                            child: _buildMetricBlock('Confidence', selectedParcel.confidence),
                          ),
                          Expanded(
                            child: _buildMetricBlock('Last update', selectedParcel.updated),
                          ),
                        ],
                      ),
                      const Divider(color: AppTheme.line, height: 24),

                      // Record History
                      Text(
                        'RECORD HISTORY',
                        style: GoogleFonts.dmSans(
                          fontSize: 8,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                          color: AppTheme.muted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...selectedParcel.history.map((h) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${h.date}  ',
                                  style: GoogleFonts.dmSans(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.ink,
                                  ),
                                ),
                                Expanded(
                                  child: Text(
                                    h.title,
                                    style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.muted),
                                  ),
                                ),
                              ],
                            ),
                          )),
                      const SizedBox(height: 10),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(38),
                          padding: EdgeInsets.zero,
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => ParcelDetailScreen(parcel: selectedParcel),
                            ),
                          );
                        },
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('VIEW FULL PARCEL INSPECTOR'),
                            const SizedBox(width: 6),
                            Text('→', style: TextStyle(color: AppTheme.yellow, fontSize: 14)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Panel 03: Request Review Quick CTA
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
                        '03 / CITIZEN ACTIONS',
                        style: GoogleFonts.dmSans(
                          fontSize: 8,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                          color: AppTheme.teal,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Submit a claim or survey objection',
                        style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.ink),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Send a survey verification, boundary dispute claim, or objection for this parcel. Each request receives a trackable ID.',
                        style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.muted, height: 1.5),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.green,
                                minimumSize: const Size.fromHeight(38),
                                padding: EdgeInsets.zero,
                              ),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => RequestSubmissionScreen(
                                      initialSurvey: selectedParcel.survey,
                                      initialVillage: selectedParcel.village,
                                    ),
                                  ),
                                );
                              },
                              child: const Text('SUBMIT REQUEST'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.ink,
                                side: const BorderSide(color: AppTheme.line),
                                minimumSize: const Size.fromHeight(38),
                                padding: EdgeInsets.zero,
                              ),
                              onPressed: () => provider.setTabIndex(1),
                              child: const Text('VIEW ON MAP'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricBlock(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.dmSans(fontSize: 9, color: AppTheme.muted),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.spaceGrotesk(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppTheme.ink,
          ),
        ),
      ],
    );
  }
}
