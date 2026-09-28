import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/citizen_model.dart';
import '../providers/citizen_provider.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController =
      TextEditingController(text: '9876543210');
  final TextEditingController _otpController =
      TextEditingController(text: '123456');
  bool _otpSent = false;
  String? _otpFeedback;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _handleSendOtp() {
    final phone = _phoneController.text.trim();
    if (phone.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 10-digit mobile number')),
      );
      return;
    }

    setState(() {
      _otpSent = true;
      _otpFeedback = 'Demo OTP sent! Code: 123456';
    });
  }

  void _handleVerifyAndLogin() async {
    final phone = _phoneController.text.trim();
    final otp = _otpController.text.trim();
    final provider = Provider.of<CitizenProvider>(context, listen: false);

    final success = await provider.loginWithOtp(phone, otp);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Authentication failed. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CitizenProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.paper,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Brand Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: AppTheme.ink,
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: Text(
                          'B',
                          style: GoogleFonts.spaceGrotesk(
                            color: AppTheme.paper,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'BhoomiSync',
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.ink,
                            ),
                          ),
                          Text(
                            'ANDHRA PRADESH / NAKSHA',
                            style: GoogleFonts.dmSans(
                              fontSize: 8,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.1,
                              color: AppTheme.muted,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.line),
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: Text(
                      'PUBLIC ACCESS',
                      style: GoogleFonts.dmSans(
                        fontSize: 8,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                        color: AppTheme.muted,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // Eyebrow with Teal Dot
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: AppTheme.teal,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'CITIZEN SERVICES / ANDHRA PRADESH',
                    style: GoogleFonts.dmSans(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: AppTheme.green,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Main Editorial Title
              RichText(
                text: TextSpan(
                  style: GoogleFonts.spaceGrotesk(
                    fontSize: 28,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.ink,
                    height: 1.15,
                  ),
                  children: [
                    const TextSpan(text: 'Public land records, '),
                    TextSpan(
                      text: 'verified with confidence.',
                      style: GoogleFonts.newsreader(
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.w400,
                        color: AppTheme.green,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Access high-precision cadastral maps, AI-harmonized boundary geometry, and submit verified claims or survey requests.',
                style: GoogleFonts.dmSans(
                  fontSize: 12,
                  color: AppTheme.muted,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 20),

              // Stylized Cadastral Graphic Preview Card
              Container(
                height: 160,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E9DC),
                  border: Border.all(color: AppTheme.lineStrong),
                  borderRadius: BorderRadius.circular(4),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1018332D),
                      offset: Offset(6, 6),
                      blurRadius: 0,
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    // Top header label
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: const BoxDecoration(
                          color: Color(0xDDF4F2E9),
                          border: Border(bottom: BorderSide(color: AppTheme.line)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'AP / CADASTRAL VIEW',
                              style: GoogleFonts.dmSans(
                                fontSize: 8,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                                color: AppTheme.muted,
                              ),
                            ),
                            Text(
                              'PUBLIC PORTAL',
                              style: GoogleFonts.dmSans(
                                fontSize: 8,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.green,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Lots
                    Positioned(
                      top: 42,
                      left: 20,
                      width: 80,
                      height: 55,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0x447FA96A),
                          border: Border.all(color: const Color(0xAA2F7F56)),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('PARCEL', style: GoogleFonts.dmSans(fontSize: 7, letterSpacing: 0.8, color: AppTheme.ink)),
                            Text('241/6', style: GoogleFonts.spaceGrotesk(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.ink)),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 48,
                      left: 115,
                      width: 85,
                      height: 55,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0x44EFC84A),
                          border: Border.all(color: const Color(0xCCEFC84A)),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('PARCEL', style: GoogleFonts.dmSans(fontSize: 7, letterSpacing: 0.8, color: AppTheme.ink)),
                            Text('241/7', style: GoogleFonts.spaceGrotesk(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.ink)),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 75,
                      left: 70,
                      width: 90,
                      height: 48,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0x33348C8B),
                          border: Border.all(color: const Color(0xAA348C8B)),
                          borderRadius: BorderRadius.circular(2),
                        ),
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('PARCEL', style: GoogleFonts.dmSans(fontSize: 7, letterSpacing: 0.8, color: AppTheme.ink)),
                            Text('242/1', style: GoogleFonts.spaceGrotesk(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.ink)),
                          ],
                        ),
                      ),
                    ),

                    // Pin
                    Positioned(
                      top: 60,
                      right: 32,
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: const BoxDecoration(
                          color: AppTheme.terracotta,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(color: Color(0x3318332D), blurRadius: 4, offset: Offset(0, 2)),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: const Icon(Icons.location_on, color: Colors.white, size: 16),
                      ),
                    ),

                    // Bottom footer label
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: const BoxDecoration(
                          color: Color(0xDDF4F2E9),
                          border: Border(top: BorderSide(color: AppTheme.line)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'TIRUPATI DISTRICT',
                              style: GoogleFonts.dmSans(
                                fontSize: 8,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.muted,
                              ),
                            ),
                            Text(
                              '13.6288° N · 79.4192° E',
                              style: GoogleFonts.dmSans(
                                fontSize: 8,
                                color: AppTheme.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Role Selector Section
              Text(
                'CHOOSE CITIZEN ROLE',
                style: GoogleFonts.dmSans(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.muted,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 90,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: CitizenRoleType.values.map((role) {
                    final isSelected = provider.activeRole == role;
                    return GestureDetector(
                      onTap: () => provider.selectRole(role),
                      child: Container(
                        width: 145,
                        margin: const EdgeInsets.only(right: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0x18348C8B) : const Color(0x33FFFFFF),
                          border: Border.all(
                            color: isSelected ? AppTheme.teal : AppTheme.line,
                            width: isSelected ? 1.5 : 1,
                          ),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Icon(
                              _getRoleIcon(role),
                              size: 18,
                              color: isSelected ? AppTheme.teal : AppTheme.muted,
                            ),
                            Text(
                              role.label,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isSelected ? AppTheme.ink : AppTheme.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 20),

              // Login Form Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0x38FFFFFF),
                  border: Border.all(color: AppTheme.line),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Citizen Mobile Verification',
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Phone Input
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      style: GoogleFonts.dmSans(color: AppTheme.ink, fontSize: 13),
                      decoration: const InputDecoration(
                        labelText: 'Mobile Number',
                        prefixText: '+91 ',
                      ),
                    ),
                    const SizedBox(height: 12),

                    if (_otpSent) ...[
                      TextField(
                        controller: _otpController,
                        keyboardType: TextInputType.number,
                        style: GoogleFonts.dmSans(color: AppTheme.ink, fontSize: 13),
                        decoration: const InputDecoration(
                          labelText: 'Enter 6-digit OTP',
                        ),
                      ),
                      if (_otpFeedback != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _otpFeedback!,
                          style: GoogleFonts.dmSans(
                            fontSize: 11,
                            color: AppTheme.green,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                      const SizedBox(height: 14),
                      ElevatedButton(
                        onPressed: provider.isLoading ? null : _handleVerifyAndLogin,
                        child: provider.isLoading
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Text('ENTER CITIZEN PORTAL'),
                                  const SizedBox(width: 8),
                                  Text('→', style: TextStyle(color: AppTheme.yellow, fontSize: 16)),
                                ],
                              ),
                      ),
                    ] else ...[
                      ElevatedButton(
                        onPressed: _handleSendOtp,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('SEND OTP CODE'),
                            const SizedBox(width: 8),
                            Text('→', style: TextStyle(color: AppTheme.yellow, fontSize: 16)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // One-click demo action
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.ink,
                  side: const BorderSide(color: AppTheme.line),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                ),
                onPressed: () {
                  provider.loginWithOtp('9876543210', '123456');
                },
                child: Text(
                  'Quick Demo Access',
                  style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getRoleIcon(CitizenRoleType role) {
    switch (role) {
      case CitizenRoleType.landOwner:
        return Icons.person_pin;
      case CitizenRoleType.propertyBuyerSeller:
        return Icons.real_estate_agent;
      case CitizenRoleType.propertyLawyer:
        return Icons.gavel;
      case CitizenRoleType.bankMortgageOfficer:
        return Icons.account_balance;
      case CitizenRoleType.realEstateDeveloper:
        return Icons.apartment;
    }
  }
}
