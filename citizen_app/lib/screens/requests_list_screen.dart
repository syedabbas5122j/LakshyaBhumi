import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/citizen_model.dart';
import '../providers/citizen_provider.dart';
import '../theme/app_theme.dart';
import 'request_submission_screen.dart';

class RequestsListScreen extends StatelessWidget {
  const RequestsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CitizenProvider>(context);
    final requests = provider.requests;

    return Scaffold(
      backgroundColor: AppTheme.paper,
      appBar: AppBar(
        title: const Text('My Requests & Claims'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, size: 20),
            tooltip: 'New Request',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => RequestSubmissionScreen(
                    initialSurvey: provider.selectedParcel.survey,
                    initialVillage: provider.selectedParcel.village,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: requests.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'No requests submitted yet',
                    style: GoogleFonts.spaceGrotesk(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.ink),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => RequestSubmissionScreen(
                            initialSurvey: provider.selectedParcel.survey,
                            initialVillage: provider.selectedParcel.village,
                          ),
                        ),
                      );
                    },
                    child: const Text('SUBMIT FIRST REQUEST'),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              itemCount: requests.length,
              itemBuilder: (context, index) {
                final req = requests[index];
                final dateStr = DateFormat('dd MMM yyyy').format(req.submittedAt);

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
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
                          Text(
                            req.id,
                            style: GoogleFonts.dmSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.green,
                            ),
                          ),
                          _buildStatusTag(req.status),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        req.title,
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        req.description,
                        style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.muted),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Survey ${req.surveyNumber} • ${req.village}',
                            style: GoogleFonts.dmSans(fontSize: 10, color: AppTheme.muted),
                          ),
                          Text(
                            dateStr,
                            style: GoogleFonts.dmSans(fontSize: 10, color: AppTheme.muted),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  Widget _buildStatusTag(RequestStatus status) {
    String label;
    Color color;

    switch (status) {
      case RequestStatus.pending:
        label = 'PENDING';
        color = AppTheme.yellow;
        break;
      case RequestStatus.underReview:
        label = 'UNDER REVIEW';
        color = AppTheme.teal;
        break;
      case RequestStatus.surveyScheduled:
        label = 'SURVEY SCHEDULED';
        color = AppTheme.green;
        break;
      case RequestStatus.resolved:
        label = 'RESOLVED';
        color = AppTheme.green;
        break;
      case RequestStatus.rejected:
        label = 'REJECTED';
        color = AppTheme.danger;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        border: Border.all(color: color, width: 0.8),
        borderRadius: BorderRadius.circular(2),
      ),
      child: Text(
        label,
        style: GoogleFonts.dmSans(fontSize: 8, fontWeight: FontWeight.w800, color: color),
      ),
    );
  }
}
