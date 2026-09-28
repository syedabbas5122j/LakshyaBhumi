import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/citizen_model.dart';
import '../providers/citizen_provider.dart';
import '../theme/app_theme.dart';
import 'parcel_detail_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();

  void _centerOnParcel(ParcelRecord parcel) {
    _mapController.move(parcel.center, 16.5);
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<CitizenProvider>(context);
    final selectedParcel = provider.selectedParcel;

    return Scaffold(
      backgroundColor: AppTheme.paper,
      body: Stack(
        children: [
          // GIS Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: selectedParcel.center,
              initialZoom: 16.0,
              minZoom: 12.0,
              maxZoom: 19.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'in.gov.bhusha.citizen_app',
              ),

              // Cadastral Polygons
              PolygonLayer(
                polygons: provider.parcels.map((parcel) {
                  final isSelected = parcel.survey == selectedParcel.survey;
                  final isHighConfidence = parcel.confidenceScore >= 0.95;

                  final fillColor = isSelected
                      ? const Color(0x66348C8B)
                      : (isHighConfidence
                          ? const Color(0x442F7F56)
                          : const Color(0x44EFC84A));

                  final borderColor = isSelected
                      ? AppTheme.ink
                      : (isHighConfidence ? AppTheme.green : AppTheme.yellow);

                  return Polygon(
                    points: parcel.boundary,
                    color: fillColor,
                    borderColor: borderColor,
                    borderStrokeWidth: isSelected ? 2.5 : 1.5,
                  );
                }).toList(),
              ),

              // Survey Pin Markers
              MarkerLayer(
                markers: provider.parcels.map((parcel) {
                  final isSelected = parcel.survey == selectedParcel.survey;
                  return Marker(
                    point: parcel.center,
                    width: 72,
                    height: 32,
                    child: GestureDetector(
                      onTap: () {
                        provider.selectParcel(parcel);
                        _centerOnParcel(parcel);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.ink : AppTheme.paper,
                          border: Border.all(
                            color: isSelected ? AppTheme.ink : AppTheme.lineStrong,
                            width: 1,
                          ),
                          borderRadius: BorderRadius.circular(2),
                          boxShadow: const [
                            BoxShadow(color: Color(0x1F18332D), blurRadius: 4, offset: Offset(0, 2)),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.location_on,
                              size: 11,
                              color: isSelected ? AppTheme.yellow : AppTheme.terracotta,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              parcel.survey,
                              style: GoogleFonts.spaceGrotesk(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: isSelected ? Colors.white : AppTheme.ink,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),

          // Top Header Overlay
          Positioned(
            top: 44,
            left: 14,
            right: 14,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xF4F4F2E9),
                border: Border.all(color: AppTheme.line),
                borderRadius: BorderRadius.circular(2),
                boxShadow: const [
                  BoxShadow(color: Color(0x1418332D), blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: Row(
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
                  Expanded(
                    child: Text(
                      'CADASTRAL OVERLAY • TIRUPATI URBAN',
                      style: GoogleFonts.dmSans(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                        color: AppTheme.muted,
                      ),
                    ),
                  ),
                  Text(
                    'AI CONFLATED',
                    style: GoogleFonts.dmSans(
                      fontSize: 8,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.green,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Map Control Floating Buttons (Right)
          Positioned(
            right: 14,
            bottom: 175,
            child: Column(
              children: [
                _buildMapControl(
                  icon: Icons.add,
                  tooltip: 'Zoom in',
                  onTap: () {
                    final zoom = _mapController.camera.zoom;
                    _mapController.move(_mapController.camera.center, zoom + 1);
                  },
                ),
                const SizedBox(height: 6),
                _buildMapControl(
                  icon: Icons.remove,
                  tooltip: 'Zoom out',
                  onTap: () {
                    final zoom = _mapController.camera.zoom;
                    _mapController.move(_mapController.camera.center, zoom - 1);
                  },
                ),
                const SizedBox(height: 6),
                _buildMapControl(
                  icon: Icons.my_location,
                  tooltip: 'Center',
                  onTap: () => _centerOnParcel(selectedParcel),
                ),
              ],
            ),
          ),

          // Floating Parcel Inspector Card (Bottom)
          Positioned(
            left: 14,
            right: 14,
            bottom: 14,
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFDF4F2E9),
                border: Border.all(color: AppTheme.lineStrong),
                borderRadius: BorderRadius.circular(4),
                boxShadow: const [
                  BoxShadow(color: Color(0x1F18332D), blurRadius: 10, offset: Offset(0, 4)),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Survey ${selectedParcel.survey}',
                            style: GoogleFonts.spaceGrotesk(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.ink,
                            ),
                          ),
                          Text(
                            '${selectedParcel.village} • ${selectedParcel.area}',
                            style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.muted),
                          ),
                        ],
                      ),
                      Text(
                        selectedParcel.confidence,
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.green,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.ink,
                            side: const BorderSide(color: AppTheme.line),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
                          ),
                          onPressed: () {
                            final parcels = provider.parcels;
                            final nextIdx = (parcels.indexOf(selectedParcel) + 1) % parcels.length;
                            provider.selectParcel(parcels[nextIdx]);
                            _centerOnParcel(parcels[nextIdx]);
                          },
                          child: Text('Next parcel →', style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
                          ),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ParcelDetailScreen(parcel: selectedParcel),
                              ),
                            );
                          },
                          child: Text('Inspector', style: GoogleFonts.dmSans(fontSize: 10, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapControl({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.paper,
        border: Border.all(color: AppTheme.line),
        borderRadius: BorderRadius.circular(2),
        boxShadow: const [
          BoxShadow(color: Color(0x1418332D), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: IconButton(
        icon: Icon(icon, color: AppTheme.ink, size: 18),
        tooltip: tooltip,
        constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
        padding: EdgeInsets.zero,
        onPressed: onTap,
      ),
    );
  }
}
