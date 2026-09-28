import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/citizen_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_navigation_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LakshyaBhumiCitizenApp());
}

class LakshyaBhumiCitizenApp extends StatelessWidget {
  const LakshyaBhumiCitizenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CitizenProvider()),
      ],
      child: Consumer<CitizenProvider>(
        builder: (context, provider, _) {
          return MaterialApp(
            title: 'BhoomiSync Citizen App',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            home: provider.isAuthenticated
                ? const MainNavigationScreen()
                : const LoginScreen(),
          );
        },
      ),
    );
  }
}
