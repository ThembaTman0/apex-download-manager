
pkgname=apex-download-manager
pkgver=1.1.1
pkgrel=1
pkgdesc="Free, open-source IDM alternative"
arch=('x86_64')
url="https://github.com/ThembaTman0/apex-download-manager"
license=('GPL-3.0-or-later')

depends=(
    'libayatana-appindicator'
    'webkit2gtk-4.1'
    'gtk3'
)

makedepends=('dpkg')

source=(
    "apexdownloadmanager.com/dl?os=deb"
)

noextract=("apex-${pkgver}.deb")

sha256sums=('SKIP')

package() {
    dpkg-deb -x "$srcdir/apex-${pkgver}.deb" "$pkgdir"
}

