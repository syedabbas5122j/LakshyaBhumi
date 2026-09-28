import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/citizen_model.dart';
import '../providers/citizen_provider.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CitizenProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.paper,
      appBar: AppBar(
        title: const Text('Citizen Account'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // User Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0x38FFFFFF),
                border: Border.all(color: AppTheme.line),
                borderRadius: BorderRadius.circular(2),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppTheme.ink,
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: Text(
                      'B',
                      style: GoogleFonts.spaceGrotesk(color: AppTheme.paper, fontSize: 20, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          provider.activeRole.label,
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.ink,
                          ),
                        ),
                        Text(
                          '+91 ${provider.contactNumber.isNotEmpty ? provider.contactNumber : '9876543210'} • OTP VERIFIED',
                          style: GoogleFonts.dmSans(fontSize: 10, color: AppTheme.green, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Role Switcher
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
                    'SWITCH ACTIVE ROLE',
                    style: GoogleFonts.dmSans(
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.muted,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...CitizenRoleType.values.map((role) {
                    final isSelected = provider.activeRole == role;
                    return InkWell(
                      onTap: () => provider.selectRole(role),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              role.label,
                              style: GoogleFonts.dmSans(
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
                                color: isSelected ? AppTheme.green : AppTheme.ink,
                              ),
                            ),
                            if (isSelected)
                              Text('✓ ACTIVE', style: GoogleFonts.dmSans(fontSize: 9, fontWeight: FontWeight.w800, color: AppTheme.green)),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Connected Government Services
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
                    'CONNECTED PORTALS',
                    style: GoogleFonts.dmSans(
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.muted,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text('Bhu-Naksha Cadastral Maps (AP) ↗', style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.ink, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Text('Meebhoomi 1-B & Adangal Records ↗', style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.ink, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Text('CCLA Andhra Pradesh ↗', style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.ink, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Sign out
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.danger,
                side: const BorderSide(color: AppTheme.line),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
              ),
              onPressed: () => provider.signOut(),
              child: Text(
                'Sign Out',
                style: GoogleFonts.dmSans(fontSize: 11, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
