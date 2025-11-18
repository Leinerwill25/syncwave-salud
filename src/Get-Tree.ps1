<#
Get-Tree-Fix.ps1
Lista la estructura de carpetas/archivos tipo "árbol" con numeración.
Diseñado para máxima compatibilidad con PowerShell Windows (5.1) y PS7.
Uso:
  # desde la carpeta que quieres listar:
  .\Get-Tree-Fix.ps1

  # o pasando la ruta:
  .\Get-Tree-Fix.ps1 -Root "C:\ruta\a\my-app\src"

  # para guardar la salida:
  .\Get-Tree-Fix.ps1 -Root "C:\ruta\a\my-app\src" -OutFile "C:\temp\estructura.txt"
#>

param(
    [string]$Root = ".",
    [int]$MaxDepth = -1,
    [string]$OutFile
)

# caracteres de caja construidos por código (evita problemas de encoding)
$BOX_VERTICAL = [char]0x2502   # │
$BOX_T        = [char]0x251C   # ├
$BOX_L        = [char]0x2514   # └
$BOX_H        = [char]0x2500   # ─

# Resolver ruta y validar
try {
    $rootResolved = (Resolve-Path -LiteralPath $Root).ProviderPath
} catch {
    Write-Error "No se encontró la ruta: $Root"
    exit 1
}

$lines = New-Object System.Collections.ArrayList

function Build-Tree {
    param(
        [string]$Path,
        [string]$Prefix = "",
        [int]$Depth = 0
    )

    if ($MaxDepth -ge 0 -and $Depth -gt $MaxDepth) { return }

    # obtener directorios y archivos por separado para compatibilidad
    $dirs = Get-ChildItem -LiteralPath $Path -Force -Directory -ErrorAction SilentlyContinue | Sort-Object Name
    $files = Get-ChildItem -LiteralPath $Path -Force -File -ErrorAction SilentlyContinue | Sort-Object Name

    $items = @()
    if ($dirs) { $items += $dirs }
    if ($files) { $items += $files }

    for ($i = 0; $i -lt $items.Count; $i++) {
        $item = $items[$i]
        $isLast = ($i -eq ($items.Count - 1))

        if ($isLast) {
            $connector = $BOX_L + $BOX_H + $BOX_H
        } else {
            $connector = $BOX_T + $BOX_H + $BOX_H
        }

        if ($item.PSIsContainer) {
            $display = $item.Name + '\'
        } else {
            $display = $item.Name
        }

        $lines.Add($Prefix + $connector + ' ' + $display) | Out-Null

        if ($item.PSIsContainer) {
            if ($isLast) {
                $newPrefix = $Prefix + '    '
            } else {
                $newPrefix = $Prefix + $BOX_VERTICAL + '   '
            }
            Build-Tree -Path $item.FullName -Prefix $newPrefix -Depth ($Depth + 1)
        }
    }
}

# añadir la raíz como primera línea
$rootName = Split-Path -Path $rootResolved -Leaf
if ([string]::IsNullOrEmpty($rootName)) { $rootName = $rootResolved }
$lines.Add($rootName + '\') | Out-Null

# construir árbol
Build-Tree -Path $rootResolved -Prefix ""

# numeración y formateo de salida (ej. " 27 │   ├── app\")
$total = $lines.Count
if ($total -eq 0) {
    Write-Output "No se encontraron elementos en: $rootResolved"
    exit 0
}
$numWidth = $total.ToString().Length
$output = New-Object System.Collections.ArrayList

for ($i = 0; $i -lt $total; $i++) {
    $num = ($i + 1).ToString().PadLeft($numWidth)
    $outputLine = "{0} {1}   {2}" -f $num, $BOX_VERTICAL, $lines[$i]
    $output.Add($outputLine) | Out-Null
}

# imprimir en consola
$output | ForEach-Object { Write-Output $_ }

# opcional: guardar en archivo si se especificó
if ($PSBoundParameters.ContainsKey('OutFile')) {
    try {
        $output | Out-File -FilePath $OutFile -Encoding UTF8
        Write-Output "`nEstructura guardada en: $OutFile"
    } catch {
        Write-Warning "No se pudo escribir el archivo: $OutFile. $_"
    }
}
