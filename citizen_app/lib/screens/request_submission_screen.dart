import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/citizen_provider.dart';
import '../theme/app_theme.dart';

class RequestSubmissionScreen extends StatefulWidget {
  final String initialSurvey;
  final String initialVillage;

  const RequestSubmissionScreen({
    super.key,
    required this.initialSurvey,
    required this.initialVillage,
  });

  @override
  State<RequestSubmissionScreen> createState() => _RequestSubmissionScreenState();
}

class _RequestSubmissionScreenState extends State<RequestSubmissionScreen> {
  final _formKey = GlobalKey<FormState>();
  late String _selectedType;
  late TextEditingController _surveyController;
  late TextEditingController _villageController;
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  String? _attachedFileName;

  final List<String> _types = ['Claim', 'Objection', 'Re-Survey'];

  @override
  void initState() {
    super.initState();
    _selectedType = _types.first;
    _surveyController = TextEditingController(text: widget.initialSurvey);
    _villageController = TextEditingController(text: widget.initialVillage);
  }

  @override
  void dispose() {
    _surveyController.dispose();
    _villageController.dispose();
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = Provider.of<CitizenProvider>(context, listen: false);
    final ticketId = await provider.submitCitizenRequest(
      surveyNumber: _surveyController.text.trim(),
      village: _villageController.text.trim(),
      type: _selectedType,
      title: _titleController.text.trim(),
      description: _descController.text.trim(),
      attachmentName: _attachedFileName,
    );

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppTheme.paper,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(2),
            side: const BorderSide(color: AppTheme.line),
          ),
          title: Text(
            'Request Registered',
            style: GoogleFonts.spaceGrotesk(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.ink),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your request has been routed to the Mandal Revenue Office and Survey team with an auditable tracking timeline.',
                style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.muted, height: 1.5),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0x38FFFFFF),
                  border: Border.all(color: AppTheme.line),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('TRACKING ID', style: GoogleFonts.dmSans(fontSize: 9, fontWeight: FontWeight.w700, color: AppTheme.muted)),
                    Text(
                      ticketId,
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.green,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CitizenProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.paper,
      appBar: AppBar(
        title: const Text('Submit Request / Claim'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Notice Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0x22348C8B),
                  border: Border.all(color: const Color(0x44348C8B)),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Text(
                  'Send a survey, claim, or objection for this parcel. Each request receives a trackable ID.',
                  style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.ink, height: 1.5),
                ),
              ),
              const SizedBox(height: 16),

              // Request Type Selector
              Text(
                'REQUEST TYPE',
                style: GoogleFonts.dmSans(
                  fontSize: 8,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.muted,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: _types.map((type) {
                  final isSelected = _selectedType == type;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedType = type),
                      child: Container(
                        margin: const EdgeInsets.only(right: 6),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0x22348C8B) : const Color(0x38FFFFFF),
                          border: Border.all(
                            color: isSelected ? AppTheme.teal : AppTheme.line,
                            width: 1,
                          ),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: Text(
                          type.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: GoogleFonts.dmSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isSelected ? AppTheme.ink : AppTheme.muted,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),

              // Survey Number
              TextFormField(
                controller: _surveyController,
                style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.ink),
                decoration: const InputDecoration(labelText: 'Survey Number'),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),

              // Village / Mandal
              TextFormField(
                controller: _villageController,
                style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.ink),
                decoration: const InputDecoration(labelText: 'Village / Mandal'),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),

              // Title
              TextFormField(
                controller: _titleController,
                style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.ink),
                decoration: const InputDecoration(labelText: 'Short title'),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),

              // Description
              TextFormField(
                controller: _descController,
                maxLines: 4,
                style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.ink),
                decoration: const InputDecoration(
                  labelText: 'Describe your request',
                  alignLabelWithHint: true,
                ),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),

              // File Attachment Simulator
              GestureDetector(
                onTap: () {
                  setState(() {
                    _attachedFileName = 'Pattadar_Passbook_Survey_${_surveyController.text.replaceAll('/', '_')}.pdf';
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0x38FFFFFF),
                    border: Border.all(color: AppTheme.line),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _attachedFileName ?? 'Supporting file (Optional)',
                        style: GoogleFonts.dmSans(
                          fontSize: 11,
                          color: _attachedFileName != null ? AppTheme.green : AppTheme.muted,
                          fontWeight: _attachedFileName != null ? FontWeight.w700 : FontWeight.normal,
                        ),
                      ),
                      Text(
                        _attachedFileName != null ? 'Attached ✓' : 'Browse...',
                        style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.teal),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Submit Button
              ElevatedButton(
                onPressed: provider.isSubmittingRequest ? null : _handleSubmit,
                child: provider.isSubmittingRequest
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('SUBMIT $_selectedType'.toUpperCase()),
                          const SizedBox(width: 8),
                          Text('→', style: TextStyle(color: AppTheme.yellow, fontSize: 16)),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
